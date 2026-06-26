// content.js — ページ内で動作。リンク収集・要素ピッカー・結果パネルUIを提供する。
// 多重注入されても二重定義しないようガードする。
(() => {
  if (window.__linkDL_loaded) return;
  window.__linkDL_loaded = true;

  // ファイルとして扱う拡張子（ここに無いものは「すべて表示」で出す）
  const FILE_EXTS = [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "rtf",
    "zip", "rar", "7z", "tar", "gz",
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff",
    "mp3", "wav", "m4a", "aac", "flac",
    "mp4", "mov", "avi", "wmv", "mkv", "webm",
    "epub", "mobi", "json", "xml",
  ];

  // ---- 言語（ja / en） ----
  const LANG = (chrome.i18n.getUILanguage() || "en").toLowerCase().startsWith("ja")
    ? "ja"
    : "en";
  const STR = {
    ja: {
      pickerTip: "クリックで要素を選択 / Esc でキャンセル",
      titlePrefix: "リンク一括DL — ",
      srcSelection: "選択範囲",
      srcSelectionEmpty: "選択範囲（テキスト未選択）",
      srcElement: "選択した要素内",
      onlyFiles: "ファイルのみ",
      filterPh: "拡張子で絞込 例: pdf,zip",
      selectAll: "全選択",
      clear: "解除",
      btnZip: "ZIPでまとめて",
      btnInd: "個別に保存",
      emptyNoLinks: "リンクが見つかりませんでした。",
      emptyNoMatch: "条件に合うファイルがありません。「ファイルのみ」を外すと全リンクを表示します。",
      titleClose: "閉じる",
      titleHelp: "使い方を見る",
      preparing: "準備中 …",
      zipping: "ZIP生成中 …",
      fetching: (d, t) => `取得中 ${d}/${t} …`,
      saving: (d, t) => (t ? `保存中 ${d}/${t} …` : "保存中 …"),
      err: (m) => "エラー: " + m,
      zipFailAll: (f) => `ZIP失敗（全${f}件取得不可）。個別保存をお試しください。`,
      zipPartial: (ok, f) => `ZIP作成 ✓ ${ok}件成功 / ${f}件は取得失敗`,
      zipDone: (ok) => `ZIP作成 ✓ ${ok}件をまとめました`,
      indDone: (ok, f) =>
        `完了 ✓ ${ok}件保存（ダウンロード/link-downloader/）${f ? ` / 失敗${f}` : ""}`,
    },
    en: {
      pickerTip: "Click an element to select / Esc to cancel",
      titlePrefix: "Link DL — ",
      srcSelection: "Selection",
      srcSelectionEmpty: "Selection (no text selected)",
      srcElement: "Picked element",
      onlyFiles: "Files only",
      filterPh: "Filter by ext, e.g. pdf,zip",
      selectAll: "All",
      clear: "None",
      btnZip: "Download as ZIP",
      btnInd: "Save individually",
      emptyNoLinks: "No links found.",
      emptyNoMatch: 'No matching files. Uncheck "Files only" to show all links.',
      titleClose: "Close",
      titleHelp: "How to use",
      preparing: "Preparing …",
      zipping: "Creating ZIP …",
      fetching: (d, t) => `Fetching ${d}/${t} …`,
      saving: (d, t) => (t ? `Saving ${d}/${t} …` : "Saving …"),
      err: (m) => "Error: " + m,
      zipFailAll: (f) => `ZIP failed (all ${f} files unreachable). Try saving individually.`,
      zipPartial: (ok, f) => `ZIP created ✓ ${ok} ok / ${f} failed`,
      zipDone: (ok) => `ZIP created ✓ bundled ${ok} files`,
      indDone: (ok, f) =>
        `Done ✓ saved ${ok} to Downloads/link-downloader/${f ? ` / failed ${f}` : ""}`,
    },
  };
  const T = STR[LANG];

  function extOf(url) {
    try {
      const u = new URL(url, location.href);
      const last = u.pathname.split("/").filter(Boolean).pop() || "";
      const m = last.match(/\.([a-z0-9]{1,5})$/i);
      return m ? m[1].toLowerCase() : "";
    } catch (e) {
      return "";
    }
  }

  function absolutize(href) {
    try {
      return new URL(href, location.href).href;
    } catch (e) {
      return null;
    }
  }

  // anchor 要素配列 → {url, ext, text} の重複なし配列
  function collectFromAnchors(anchors) {
    const seen = new Set();
    const out = [];
    for (const a of anchors) {
      const raw = a.getAttribute("href");
      if (!raw) continue;
      if (/^(javascript:|mailto:|tel:|#)/i.test(raw.trim())) continue;
      const url = absolutize(raw);
      if (!url || !/^https?:/i.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        ext: extOf(url),
        text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      });
    }
    return out;
  }

  // ---- 選択範囲からの収集 ----
  function collectFromSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null; // 選択なし
    const all = Array.from(document.querySelectorAll("a[href]"));
    const anchors = [];
    for (let i = 0; i < sel.rangeCount; i++) {
      const range = sel.getRangeAt(i);
      for (const a of all) {
        try {
          if (range.intersectsNode(a)) anchors.push(a);
        } catch (e) {}
      }
    }
    return collectFromAnchors(anchors);
  }

  // ---- 要素ピッカー ----
  let pickerActive = false;
  function startPicker() {
    if (pickerActive) return;
    pickerActive = true;

    const hl = document.createElement("div");
    Object.assign(hl.style, {
      position: "fixed",
      zIndex: "2147483646",
      background: "rgba(56,132,255,0.25)",
      border: "2px solid #3884ff",
      pointerEvents: "none",
      borderRadius: "3px",
      transition: "all 30ms linear",
      boxSizing: "border-box",
    });
    document.documentElement.appendChild(hl);

    const tip = document.createElement("div");
    tip.textContent = T.pickerTip;
    Object.assign(tip.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#111",
      color: "#fff",
      font: "13px system-ui, sans-serif",
      padding: "6px 12px",
      borderRadius: "6px",
      pointerEvents: "none",
      boxShadow: "0 2px 8px rgba(0,0,0,.3)",
    });
    document.documentElement.appendChild(tip);

    let current = null;

    function onMove(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === hl || el === tip) return;
      current = el;
      const r = el.getBoundingClientRect();
      Object.assign(hl.style, {
        top: r.top + "px",
        left: r.left + "px",
        width: r.width + "px",
        height: r.height + "px",
      });
    }

    function cleanup() {
      pickerActive = false;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      hl.remove();
      tip.remove();
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const el = current;
      cleanup();
      if (!el) return;
      const anchors = [];
      if (el.matches && el.matches("a[href]")) anchors.push(el);
      anchors.push(...el.querySelectorAll("a[href]"));
      const links = collectFromAnchors(anchors);
      showPanel(links, T.srcElement);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
      }
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
  }

  // ---- 結果パネル ----
  let panelHost = null;
  function showPanel(links, sourceLabel) {
    if (panelHost) panelHost.remove();
    panelHost = document.createElement("div");
    panelHost.style.all = "initial";
    const shadow = panelHost.attachShadow({ mode: "open" });
    document.documentElement.appendChild(panelHost);

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .wrap { position: fixed; top: 16px; right: 16px; width: 420px; max-height: 80vh;
        background: #fff; color: #1a1a1a; font: 13px/1.5 system-ui, sans-serif;
        border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.25); z-index: 2147483647;
        display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e2e2; }
      .hd { padding: 10px 12px; background: #1f6feb; color: #fff; cursor: move;
        display: flex; align-items: center; gap: 8px; }
      .hd b { font-size: 14px; flex: 1; }
      .hd .x { cursor: pointer; font-size: 18px; line-height: 1; opacity:.9; }
      .hd .x:hover { opacity: 1; }
      .hd .qm { cursor: pointer; width: 20px; height: 20px; border-radius: 50%;
        border: 1.5px solid #fff; display: inline-flex; align-items: center;
        justify-content: center; font-size: 12px; font-weight: 700; opacity: .9; }
      .hd .qm:hover { opacity: 1; background: rgba(255,255,255,.2); }
      .bar { padding: 8px 12px; display: flex; gap: 8px; align-items: center;
        border-bottom: 1px solid #eee; flex-wrap: wrap; }
      .bar label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
      .bar .grow { flex: 1; }
      .bar button { cursor: pointer; }
      .list { overflow-y: auto; flex: 1; }
      .row { display: flex; gap: 8px; padding: 7px 12px; border-bottom: 1px solid #f2f2f2;
        align-items: flex-start; }
      .row:hover { background: #f7f9ff; }
      .row input { margin-top: 3px; }
      .meta { flex: 1; min-width: 0; }
      .meta .t { font-weight: 600; word-break: break-all; }
      .meta .u { color: #777; font-size: 11px; word-break: break-all; }
      .tag { background: #eef2ff; color: #3b53c4; border-radius: 4px; padding: 0 5px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
      .tag.none { background: #f0f0f0; color: #999; }
      .ft { padding: 10px 12px; border-top: 1px solid #eee; display: flex;
        gap: 8px; align-items: center; }
      .ft button { border: none; border-radius: 7px; padding: 9px 10px;
        font-size: 13px; font-weight: 700; cursor: pointer; }
      .ft .zip { flex: 1.4; background: #1f6feb; color: #fff; }
      .ft .ind { flex: 1; background: #eef2ff; color: #1f6feb; }
      .ft button:disabled { opacity: .5; cursor: default; }
      .count { color: #555; font-size: 11px; white-space: nowrap; margin-right: 2px; }
      .status { padding: 0 12px; max-height: 0; overflow: hidden; transition: max-height .2s;
        color: #1f6feb; font-size: 12px; }
      .status.show { max-height: 60px; padding: 8px 12px; border-top: 1px solid #eee; }
      .empty { padding: 28px 12px; text-align: center; color: #888; }
      select, input[type=text] { font: inherit; padding: 3px 6px; border: 1px solid #ccc;
        border-radius: 5px; }
    `;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.innerHTML = `
      <div class="hd">
        <b>${T.titlePrefix}${sourceLabel}</b>
        <span class="qm" title="${T.titleHelp}">?</span>
        <span class="x" title="${T.titleClose}">×</span>
      </div>
      <div class="bar">
        <label><input type="checkbox" class="onlyfiles" checked> ${T.onlyFiles}</label>
        <input type="text" class="filter" placeholder="${T.filterPh}" style="width:130px">
        <span class="grow"></span>
        <button class="all">${T.selectAll}</button>
        <button class="none">${T.clear}</button>
      </div>
      <div class="list"></div>
      <div class="status"></div>
      <div class="ft">
        <span class="count"></span>
        <button class="zip">${T.btnZip}</button>
        <button class="ind">${T.btnInd}</button>
      </div>
    `;
    shadow.appendChild(wrap);

    const listEl = wrap.querySelector(".list");
    const countEl = wrap.querySelector(".count");
    const zipBtn = wrap.querySelector(".zip");
    const indBtn = wrap.querySelector(".ind");
    const statusEl = wrap.querySelector(".status");
    const onlyFiles = wrap.querySelector(".onlyfiles");
    const filterInp = wrap.querySelector(".filter");

    function visibleLinks() {
      const filterExts = filterInp.value
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean);
      return links.filter((l) => {
        if (onlyFiles.checked && !FILE_EXTS.includes(l.ext)) return false;
        if (filterExts.length && !filterExts.includes(l.ext)) return false;
        return true;
      });
    }

    function render() {
      const vis = visibleLinks();
      listEl.innerHTML = "";
      if (vis.length === 0) {
        const d = document.createElement("div");
        d.className = "empty";
        d.textContent = links.length === 0 ? T.emptyNoLinks : T.emptyNoMatch;
        listEl.appendChild(d);
      }
      for (const l of vis) {
        const row = document.createElement("div");
        row.className = "row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = true;
        cb.dataset.url = l.url;
        const meta = document.createElement("div");
        meta.className = "meta";
        const t = document.createElement("div");
        t.className = "t";
        t.textContent = l.text || decodeURIComponent(l.url.split("/").pop() || l.url);
        const u = document.createElement("div");
        u.className = "u";
        u.textContent = l.url;
        meta.appendChild(t);
        meta.appendChild(u);
        const tag = document.createElement("span");
        tag.className = "tag" + (l.ext ? "" : " none");
        tag.textContent = l.ext || "link";
        row.appendChild(cb);
        row.appendChild(meta);
        row.appendChild(tag);
        listEl.appendChild(row);
      }
      updateCount();
    }

    function checkedUrls() {
      return Array.from(listEl.querySelectorAll("input[type=checkbox]"))
        .filter((c) => c.checked)
        .map((c) => c.dataset.url);
    }
    function updateCount() {
      const n = checkedUrls().length;
      const total = visibleLinks().length;
      countEl.textContent = `${n}/${total}`;
      zipBtn.disabled = n === 0;
      indBtn.disabled = n === 0;
    }

    function setStatus(text, show = true) {
      statusEl.textContent = text;
      statusEl.classList.toggle("show", show);
    }
    function setBusy(busy) {
      zipBtn.disabled = busy || checkedUrls().length === 0;
      indBtn.disabled = busy || checkedUrls().length === 0;
    }

    // 進捗メッセージ（background から）
    if (!window.__linkDL_progressBound) {
      window.__linkDL_progressBound = true;
      chrome.runtime.onMessage.addListener((m) => {
        if (!m || m.type !== "DL_PROGRESS" || !window.__linkDL_status) return;
        const s = window.__linkDL_status;
        if (m.phase === "fetch") s(T.fetching(m.done, m.total));
        else if (m.phase === "zipping") s(T.zipping);
        else if (m.phase === "list") s(T.saving(m.done, m.total));
      });
    }
    window.__linkDL_status = setStatus;

    listEl.addEventListener("change", updateCount);
    onlyFiles.addEventListener("change", render);
    filterInp.addEventListener("input", render);
    wrap.querySelector(".all").addEventListener("click", () => {
      listEl.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = true));
      updateCount();
    });
    wrap.querySelector(".none").addEventListener("click", () => {
      listEl.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = false));
      updateCount();
    });
    wrap.querySelector(".x").addEventListener("click", () => panelHost.remove());
    wrap.querySelector(".qm").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_HELP" });
    });

    // ページタイトルからzip名を作る
    function zipName() {
      const t = (document.title || "links").replace(/[\/\\:*?"<>|]+/g, "_").trim().slice(0, 40);
      return t || "links";
    }

    zipBtn.addEventListener("click", () => {
      const urls = checkedUrls();
      if (!urls.length) return;
      setBusy(true);
      setStatus(T.preparing);
      chrome.runtime.sendMessage(
        { type: "DOWNLOAD_ZIP", urls, zipName: zipName() },
        (resp) => {
          setBusy(false);
          if (chrome.runtime.lastError) {
            setStatus(T.err(chrome.runtime.lastError.message));
            return;
          }
          if (!resp.zipped) {
            setStatus(T.zipFailAll(resp.fail));
          } else if (resp.fail > 0) {
            setStatus(T.zipPartial(resp.ok, resp.fail));
          } else {
            setStatus(T.zipDone(resp.ok));
          }
        }
      );
    });

    indBtn.addEventListener("click", () => {
      const urls = checkedUrls();
      if (!urls.length) return;
      setBusy(true);
      setStatus(T.saving());
      chrome.runtime.sendMessage({ type: "DOWNLOAD_LIST", urls }, (resp) => {
        setBusy(false);
        if (chrome.runtime.lastError) {
          setStatus(T.err(chrome.runtime.lastError.message));
          return;
        }
        setStatus(T.indDone(resp.ok, resp.fail));
      });
    });

    // ドラッグ移動
    (function makeDraggable() {
      const hd = wrap.querySelector(".hd");
      let sx, sy, ox, oy, dragging = false;
      hd.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("x")) return;
        dragging = true;
        const r = wrap.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        wrap.style.right = "auto";
        wrap.style.left = r.left + "px";
        wrap.style.top = r.top + "px";
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        wrap.style.left = ox + (e.clientX - sx) + "px";
        wrap.style.top = oy + (e.clientY - sy) + "px";
      });
      window.addEventListener("mouseup", () => (dragging = false));
    })();

    render();
  }

  // ---- popup からの起動エントリ ----
  window.__linkDL_start = function (mode) {
    if (mode === "selection") {
      const links = collectFromSelection();
      if (links === null) {
        showPanel([], T.srcSelectionEmpty);
      } else {
        showPanel(links, T.srcSelection);
      }
    } else if (mode === "picker") {
      startPicker();
    }
  };
})();
