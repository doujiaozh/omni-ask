/* Omni-Ask 弹窗逻辑：列出将收到问题的 AI 标签页，把问题发给 background 分发。 */
const $ = (id) => document.getElementById(id);
const qEl = $("q"), btn = $("ask"), status = $("status"), targets = $("targets");

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function refreshTargets() {
  try {
    const list = await chrome.runtime.sendMessage({ type: "LIST_TARGETS" });
    if (!Array.isArray(list) || list.length === 0) {
      targets.innerHTML = '<div class="hint">未检测到已打开的 AI 聊天页面。<br>请先打开 DeepSeek / 豆包 / Kimi 等页面，并停留在聊天界面。</div>';
      return;
    }
    targets.innerHTML = list
      .map((t) => `<div class="tab"><b>${esc(t.name)}</b><span>${esc(t.title || "")}</span></div>`)
      .join("");
  } catch (e) {
    targets.innerHTML = `<div class="hint">读取标签页失败：${esc(e && e.message || e)}</div>`;
  }
}

async function submit() {
  const text = qEl.value.trim();
  if (!text) { status.textContent = "请先输入问题。"; qEl.focus(); return; }
  btn.disabled = true;
  status.textContent = "分发中…";
  try {
    const res = await chrome.runtime.sendMessage({ type: "ASK", question: text });
    if (!Array.isArray(res) || res.length === 0) {
      status.innerHTML = '<span class="bad">没有可分发的 AI 页面，请先打开至少一个 AI 聊天页面。</span>';
    } else {
      status.innerHTML = res
        .map((r) => r.ok
          ? `<div class="ok">✔ ${esc(r.name)}：已发送（${r.how === "button" ? "点击发送按钮" : "模拟回车"}）</div>`
          : `<div class="bad">✘ ${esc(r.name)}：失败（${esc(r.error || "未知错误")}）</div>`)
        .join("");
    }
  } catch (e) {
    status.innerHTML = `<div class="bad">分发失败：${esc(e && e.message || e)}</div>`;
  }
  btn.disabled = false;
}

btn.addEventListener("click", submit);
qEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
});
refreshTargets();
