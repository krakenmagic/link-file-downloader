// popup.js — 2つのボタンから content.js を注入してモード起動する。

async function run(mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  // chrome:// や Web Store では動かないので軽く弾く
  if (/^(chrome|edge|about|chrome-extension):/i.test(tab.url || "")) {
    alert("このページでは動作しません（通常のWebページで使ってください）。");
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
    alert("起動に失敗しました: " + e.message);
  }
}

document.getElementById("selection").addEventListener("click", () => run("selection"));
document.getElementById("picker").addEventListener("click", () => run("picker"));
document.getElementById("help").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
  window.close();
});
