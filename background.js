// background.js — service worker (MV3)
// 2モード:
//  DOWNLOAD_LIST … 1ファイルずつ「ダウンロード/link-downloader/」へ直接保存（ダイアログ無し）
//  DOWNLOAD_ZIP  … 全ファイルを service worker でfetch→zip→1ファイルだけ保存（ダイアログ1回）
// service worker は host_permissions(<all_urls>) によりクロスオリジンfetchがCORS制限を受けない。

importScripts("jszip.min.js");

const SUBDIR = "link-downloader";

function basenameFromUrl(url) {
  try {
    const u = new URL(url);
    let name = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    if (!name) name = (u.hostname + u.pathname).replace(/[\/\\:*?"<>|]+/g, "_");
    name = name.replace(/[\/\\:*?"<>|]+/g, "_").trim();
    return name || "download";
  } catch (e) {
    return "download";
  }
}

// ---- 個別ダウンロード（サブフォルダへ） ----
async function downloadOne(url) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok, info) => {
      if (settled) return;
      settled = true;
      resolve({ url, ok, info });
    };
    try {
      chrome.downloads.download(
        {
          url,
          filename: SUBDIR + "/" + basenameFromUrl(url),
          conflictAction: "uniquify",
          saveAs: false,
        },
        (downloadId) => {
          if (chrome.runtime.lastError || downloadId === undefined) {
            done(false, chrome.runtime.lastError?.message || "失敗");
          } else {
            done(true, downloadId);
          }
        }
      );
    } catch (e) {
      done(false, String(e));
    }
  });
}

async function handleList(urls, tabId) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const r = await downloadOne(urls[i]);
    results.push(r);
    notify(tabId, { phase: "list", done: i + 1, total: urls.length });
    await new Promise((res) => setTimeout(res, 100));
  }
  const ok = results.filter((r) => r.ok).length;
  return { ok, fail: results.length - ok, results };
}

// ---- ZIP ダウンロード ----
function notify(tabId, payload) {
  if (tabId == null) return;
  chrome.tabs.sendMessage(tabId, { type: "DL_PROGRESS", ...payload }).catch(() => {});
}

// data: URL を組み立てて chrome.downloads に渡す（service worker は createObjectURL 不可のため）
function base64ToDataUrl(b64) {
  return "data:application/zip;base64," + b64;
}

async function handleZip(urls, tabId, zipName) {
  const zip = new JSZip();
  const used = new Map();
  let okCount = 0;
  const fails = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    notify(tabId, { phase: "fetch", done: i, total: urls.length, url });
    try {
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const buf = await resp.arrayBuffer();
      // 重複ファイル名は連番化
      let name = basenameFromUrl(url);
      if (used.has(name)) {
        const n = used.get(name) + 1;
        used.set(name, n);
        const dot = name.lastIndexOf(".");
        name = dot > 0 ? `${name.slice(0, dot)}(${n})${name.slice(dot)}` : `${name}(${n})`;
      } else {
        used.set(name, 0);
      }
      zip.file(name, buf);
      okCount++;
    } catch (e) {
      fails.push({ url, error: String(e.message || e) });
    }
  }

  if (okCount === 0) {
    return { ok: 0, fail: fails.length, fails, zipped: false };
  }

  notify(tabId, { phase: "zipping", total: urls.length });
  const b64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE" });
  const dataUrl = base64ToDataUrl(b64);

  await new Promise((resolve) => {
    chrome.downloads.download(
      { url: dataUrl, filename: (zipName || "files") + ".zip", saveAs: true },
      () => resolve()
    );
  });

  return { ok: okCount, fail: fails.length, fails, zipped: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  if (msg && msg.type === "DOWNLOAD_LIST" && Array.isArray(msg.urls)) {
    handleList(msg.urls, tabId).then(sendResponse);
    return true;
  }
  if (msg && msg.type === "DOWNLOAD_ZIP" && Array.isArray(msg.urls)) {
    handleZip(msg.urls, tabId, msg.zipName).then(sendResponse);
    return true;
  }
  if (msg && msg.type === "OPEN_HELP") {
    chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
  }
});
