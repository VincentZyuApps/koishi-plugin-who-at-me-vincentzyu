const pkg = require('../package.json')

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>Koishi 插件：who-at-me-vincentzyu</h1>
<h2>📬 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-who-at-me-vincentzyu?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-who-at-me-vincentzyu?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12566" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12566-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
  <br>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    前往 Gitee README 获得更佳观感 →
    <i>https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu</i>
  </a>
</p>

<hr>

<details>
<summary><h2>📖 插件详细说明（点击展开）</h2></summary>

<h2>🎯 功能简介</h2>
<p>自动监听并记录群聊中的 @ 消息，支持分页查询、三种输出格式、自定义渲染。</p>

<h3>📸 效果预览</h3>
<p><img src="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu/releases/download/preview/preview.png" alt="who-at-me 效果预览" width="600"></p>

<h3>📥 数据库监听</h3>
<ul>
  <li>实时监听群聊消息，自动提取 @ 行为并存入数据库</li>
  <li>支持前置中间件 / 普通中间件切换，优先级可调</li>
</ul>

<h3>📋 可用命令</h3>
<table>
  <tr><th>命令</th><th>说明</th><th>示例</th></tr>
  <tr><td><code>who-at-me</code></td><td>查询自己的被 @ 记录</td><td><code>who-at-me</code></td></tr>
  <tr><td><code>who-at-me &lt;@用户&gt;</code></td><td>查询指定用户的被 @ 记录</td><td><code>who-at-me @小明</code></td></tr>
  <tr><td><code>... -p &lt;页码&gt;</code></td><td>指定查询页码</td><td><code>who-at-me -p 2</code></td></tr>
  <tr><td><code>... -s &lt;条数&gt;</code></td><td>指定每页显示条数</td><td><code>who-at-me -p 1 -s 20</code></td></tr>
  <tr><td><code>... -o false</code></td><td>切换为全平台检索</td><td><code>who-at-me -o false</code></td></tr>
</table>

<h3>🖼️ 三种输出格式</h3>
<ul>
  <li><b>📝 文本</b> —— 纯文本分页展示，通用性强，任何平台均可使用</li>
  <li><b>🖼️ 图片</b> —— Puppeteer 将 HTML 模板渲染为图片输出，支持主题色、字体、颜色自定义</li>
  <li><b>📎 合并转发</b> —— 以合并转发消息形式展示（目前仅 onebot 平台支持）</li>
</ul>

<h3>🎨 自定义渲染（图片格式）</h3>
<ul>
  <li><b>10 种颜色</b> —— 主题色、页面背景、卡片背景/边框、主/副文字、分隔线、作者名/背景、页脚文字均可自定义</li>
  <li><b>自定义字体</b> —— 支持指定系统字体文件路径，自动嵌入图片</li>
  <li><b>截图格式</b> —— 支持 png / jpeg / webp 输出，jpeg/webp 可调截图质量</li>
</ul>

</details>

<hr>
`
