# Omni-Ask · 全提问

一个 Chrome 浏览器扩展（**Manifest V3，纯原生 JS/HTML/CSS，零构建、零依赖**）。

在插件输入框里写一个问题，一键把问题**同时发送到当前浏览器中已打开的多个 AI 聊天页面**（DeepSeek、豆包、Kimi、ChatGPT、Claude、Gemini、通义千问、文心一言、腾讯元宝、智谱清言等）。

## 加载方法（直接把这个文件夹拖进去就能用）

1. 打开 Chrome，地址栏输入 `chrome://extensions/` 回车。
2. 打开右上角**「开发者模式」**开关。
3. 点击**「加载已解压的扩展程序」**，选择本文件夹。
4. 打开若干 AI 聊天标签页（如 `deepseek.com`、`doubao.com`、`kimi.com`），停在聊天界面。
5. 点击工具栏中的 Omni-Ask 图标，输入问题，点击**「分发提问」**（或直接按 Enter）。

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `manifest.json` | MV3 配置；权限 `activeTab` / `scripting` / `tabs` + 各 AI 站点 host_permissions |
| `popup.html` / `popup.js` | 弹窗界面：输入框、分发按钮、目标页列表、结果回显 |
| `background.js` | Service Worker：`chrome.tabs.query` 查找 AI 标签页，`chrome.scripting.executeScript` 注入 |
| `content.js` | 注入脚本：自适应查找 `textarea` / `contenteditable`，填入文本并点击发送按钮 / 模拟回车 |

## 新增一个 AI 站点

1. 在 `manifest.json` 的 `host_permissions` 中加入对应域名。
2. 在 `background.js` 的 `SITES` 中加入名称与 URL 匹配规则。
3. 在 `chrome://extensions/` 里重新加载扩展即可。

## 说明

- 注入原理是「原生 setter 设值 + 触发 input 事件 + 点击发送按钮 / 模拟回车」，兼容 React/Vue 等框架的受控输入框；若某站点改版导致失效，调整 `content.js` 中的选择器即可。
- 所有操作均在本地浏览器内完成，不上传任何数据。

## License

MIT
