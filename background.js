/* Omni-Ask background service worker（MV3）
 * 核心：chrome.tabs.query 查找已打开的 AI 聊天标签页，
 *       chrome.scripting.executeScript 注入 content.js 完成填入与发送。
 */

// 已适配站点。新增站点时：1) 在 manifest.json 的 host_permissions 加域名；2) 在这里加匹配规则。
const SITES = [
  { name: "DeepSeek",  patterns: [/^https?:\/\/[^/]*deepseek\.com\//i] },
  { name: "豆包",      patterns: [/^https?:\/\/[^/]*doubao\.com\//i] },
  { name: "Kimi",      patterns: [/^https?:\/\/[^/]*(?:kimi\.com|kimi\.moonshot\.cn)\//i] },
  { name: "ChatGPT",   patterns: [/^https?:\/\/[^/]*(?:chatgpt\.com|chat\.openai\.com)\//i] },
  { name: "Claude",    patterns: [/^https?:\/\/[^/]*claude\.ai\//i] },
  { name: "Gemini",    patterns: [/^https?:\/\/[^/]*gemini\.google\.com\//i] },
  { name: "通义千问",   patterns: [/^https?:\/\/[^/]*tongyi\.aliyun\.com\//i] },
  { name: "文心一言",   patterns: [/^https?:\/\/[^/]*yiyan\.baidu\.com\//i] },
  { name: "腾讯元宝",   patterns: [/^https?:\/\/[^/]*yuanqi\.tencent\.com\//i] },
  { name: "智谱清言",   patterns: [/^https?:\/\/[^/]*chatglm\.cn\//i] },
];

function matchSite(url = "") {
  for (const s of SITES) {
    if (s.patterns.some((p) => p.test(url))) return s;
  }
  return null;
}

async function listTargets() {
  const tabs = await chrome.tabs.query({});
  const out = [];
  for (const t of tabs) {
    const site = matchSite(t.url);
    if (!site) continue;
    out.push({ id: t.id, name: site.name, title: t.title || t.url });
  }
  return out;
}

async function askOne(tab, question) {
  // 先把问题写入该标签页 isolated world 的 window 上，供 content.js 稳定取参。
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (text) => { window.__omniAskQuestion = text; },
    args: [question],
  });
  // 注入 content.js 执行填入 + 发送，返回 { ok, how, error }
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
  const r = results && results[0] && results[0].result;
  return r || { ok: false, error: "注入未返回结果" };
}

async function askAll(question) {
  const targets = await listTargets();
  const results = [];
  for (const t of targets) {
    try {
      const r = await askOne(t, question);
      results.push({ name: t.name, title: t.title, ok: !!r.ok, how: r.how, error: r.error });
    } catch (e) {
      results.push({ name: t.name, title: t.title, ok: false, error: String((e && e.message) || e) });
    }
  }
  return results;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;
  (async () => {
    try {
      if (msg.type === "LIST_TARGETS") {
        sendResponse(await listTargets());
      } else if (msg.type === "ASK") {
        sendResponse(await askAll(msg.question || ""));
      } else {
        sendResponse({ error: "unknown message type" });
      }
    } catch (e) {
      sendResponse({ error: String((e && e.message) || e) });
    }
  })();
  return true; // 异步响应
});
