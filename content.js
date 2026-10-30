/* Omni-Ask content script（由 background.js 经 executeScript 注入到 AI 聊天页面）
 * 自适应遍历页面中的 textarea / contenteditable 输入框，填入问题，
 * 然后优先点击"发送"按钮，找不到则模拟回车。
 * 取参：window.__omniAskQuestion（由 background 预先写入），兼容 executeScript args。
 */
return (async () => {
  let q = "";
  try { q = String(window.__omniAskQuestion || "").trim(); } catch (e) {}
  if (!q) { try { q = String(question).trim(); } catch (e) {} }
  if (!q) return { ok: false, error: "问题为空" };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isVisible = (el) =>
    !!el &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none";
  const area = (el) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, r.width) * Math.max(0, r.height);
  };

  // ---- 1. 找输入框：优先可见的 textarea，其次 contenteditable，各取可见面积最大者
  const tas = [...document.querySelectorAll("textarea")]
    .filter(isVisible)
    .sort((a, b) => area(b) - area(a));
  const ces = [...document.querySelectorAll('[contenteditable=""],[contenteditable="true"]')]
    .filter(isVisible)
    .sort((a, b) => area(b) - area(a));
  const input = tas[0] || ces[0];
  if (!input) return { ok: false, error: "页面未找到可用的输入框" };

  // ---- 2. 填入文本（兼容 React/Vue 等框架的受控组件：原生 setter + input 事件）
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const proto = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(input, q);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();
  } else {
    input.focus();
    let inserted = false;
    try { inserted = document.execCommand("insertText", false, q); } catch (e) {}
    if (!inserted || input.textContent.trim() !== q) {
      input.textContent = q;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: q }));
    }
  }
  await sleep(300); // 等待框架状态更新、启用发送按钮

  // ---- 3. 发送：优先找可用的发送按钮并点击，找不到则模拟回车
  const findSendButton = () => {
    const SEL = [
      'button[data-testid*="send" i]',
      'button[aria-label*="send" i]',
      'button[aria-label*="发送"]',
      'div[role="button"][aria-label*="send" i]',
      'div[role="button"][aria-label*="发送"]',
      'button[type="submit"]',
      'button[class*="send" i]',
      'div[class*="send" i][role="button"]',
    ];
    const cands = [...document.querySelectorAll(SEL.join(","))].filter((b) => {
      if (b.disabled) return false;
      const ad = b.getAttribute("aria-disabled");
      if (ad === "true") return false;
      return isVisible(b);
    });
    if (!cands.length) return null;
    const form = input.closest("form");
    if (form) {
      const inForm = cands.filter((b) => form.contains(b));
      if (inForm.length) return inForm[inForm.length - 1];
    }
    return cands[cands.length - 1];
  };

  let how;
  const btn = findSendButton();
  if (btn) {
    btn.click();
    how = "button";
  } else {
    const opts = { bubbles: true, cancelable: true, code: "Enter", key: "Enter", keyCode: 13, which: 13 };
    input.dispatchEvent(new KeyboardEvent("keydown", opts));
    input.dispatchEvent(new KeyboardEvent("keypress", opts));
    input.dispatchEvent(new KeyboardEvent("keyup", opts));
    how = "enter";
  }
  await sleep(150);
  return { ok: true, how };
})();
