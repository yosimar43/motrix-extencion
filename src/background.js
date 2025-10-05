// Motrix RPC URL
const MOTRIX_RPC_URL = "http://localhost:16800/jsonrpc";

// Default configuration
const DEFAULT_MIN_MB = 5;
const DEFAULT_EXCLUDED = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
  ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".wav", ".ogg"
];

// In-memory storage for duplicate prevention
const processedIds = new Set();
const recentUrls = new Map();

// Time windows
const URL_DUPLICATE_WINDOW = 5000;
const ID_TTL = 60 * 1000;

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create("motrix_ext_installed", {
    type: "basic",
    iconUrl: "icon.png",
    title: "Motrix Extension",
    message: "Extension ready to send files to Motrix ✅",
  });
});

// Download interception
chrome.downloads.onCreated.addListener((downloadItem) => {
  try {
    if (!downloadItem || !downloadItem.url) return;
    const now = Date.now();

    if (processedIds.has(downloadItem.id)) return;

    const last = recentUrls.get(downloadItem.url);
    if (last && (now - last) < URL_DUPLICATE_WINDOW) return;

    processedIds.add(downloadItem.id);
    recentUrls.set(downloadItem.url, now);
    setTimeout(() => processedIds.delete(downloadItem.id), ID_TTL);

    chrome.storage.local.get(["skipNext", "minSizeMB", "excludedExt"], (data) => {
      if (data && data.skipNext) {
        chrome.storage.local.remove("skipNext");
        return;
      }

      const minMB = (data && data.minSizeMB) ? data.minSizeMB : DEFAULT_MIN_MB;
      const minBytes = minMB * 1024 * 1024;
      const excludedExt = (data && Array.isArray(data.excludedExt) && data.excludedExt.length)
        ? data.excludedExt.map(e => e.toLowerCase())
        : DEFAULT_EXCLUDED;

      const urlLower = downloadItem.url.toLowerCase();
      if (excludedExt.some(ext => urlLower.endsWith(ext))) return;

      if (downloadItem.fileSize && downloadItem.fileSize < minBytes) return;

      chrome.downloads.cancel(downloadItem.id, () => {
        chrome.notifications.create(`motrix_notify_${downloadItem.id}`, {
          type: "basic",
          iconUrl: "icon.png",
          title: "Motrix",
          message: "Sending download to Motrix..."
        }, () => {
          comprobarMotrix()
            .then(() => enviarAMotrix(downloadItem.url))
            .catch(() => {
              chrome.notifications.update(`motrix_notify_${downloadItem.id}`, {
                title: "Motrix not detected ⚠️",
                message: "Ensure Motrix is open with RPC enabled."
              });
            });
        });
      });
    });
  } catch (err) {
    console.error("Error in onCreated:", err);
  }
});

// Motrix RPC functions
function comprobarMotrix() {
  return fetch(MOTRIX_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "ping",
      method: "aria2.getVersion",
      params: []
    }),
  }).then((res) => {
    if (!res.ok) throw new Error("Motrix RPC unavailable");
    return res.json();
  });
}

function enviarAMotrix(url) {
  return fetch(MOTRIX_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "aria2.addUri",
      id: new Date().getTime().toString(),
      params: [[url]],
    }),
  });
}
