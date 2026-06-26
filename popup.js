// popup.js — 2モードの起動 + 使い方ページを開く。日本語/英語に対応。

const LANG = (chrome.i18n.getUILanguage() || "en").toLowerCase().startsWith("ja")
  ? "ja"
  : "en";

const STR = {
  ja: {
    hd: "リンク一括ダウンローダー",
    sub: "ページ上のリンクからファイルをまとめて取得します。",
    selTitle: "📝 選択範囲から取得",
    selDesc: "ページ上でテキストを選択してからクリック",
    pickTitle: "🎯 要素を選んで取得",
    pickDesc: "クリックでブロックを指定し、その中のリンクを収集",
    helpTitle: "❓ 使い方を見る",
    helpDesc: "操作方法・保存先設定のマニュアル",
    note: "結果は右上のパネルに表示。チェックして保存。",
    notAllowed: "このページでは動作しません（通常のWebページで使ってください）。",
    startFail: "起動に失敗しました: ",
  },
  en: {
    hd: "Link File Downloader",
    sub: "Collect files from links on the page.",
    selTitle: "📝 From selection",
    selDesc: "Select text on the page, then click",
    pickTitle: "🎯 Pick an element",
    pickDesc: "Click a block to collect links inside it",
    helpTitle: "❓ How to use",
    helpDesc: "Manual: usage & save-location setup",
    note: "Results appear in the top-right panel. Check items and save.",
    notAllowed: "This page is not supported. Use it on a normal web page.",
    startFail: "Failed to start: ",
  },
};
const T = STR[LANG];

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

setText("t-hd", T.hd);
setText("t-sub", T.sub);
setText("t-sel-title", T.selTitle);
setText("t-sel-desc", T.selDesc);
setText("t-pick-title", T.pickTitle);
setText("t-pick-desc", T.pickDesc);
setText("t-help-title", T.helpTitle);
setText("t-help-desc", T.helpDesc);
setText("t-note", T.note);

async function run(mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (/^(chrome|edge|about|chrome-extension):/i.test(tab.url || "")) {
    alert(T.notAllowed);
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (m) => window.__linkDL_start(m),
      args: [mode],
    });
    window.close();
  } catch (e) {
    alert(T.startFail + e.message);
  }
}

document.getElementById("selection").addEventListener("click", () => run("selection"));
document.getElementById("picker").addEventListener("click", () => run("picker"));
document.getElementById("help").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
  window.close();
});
