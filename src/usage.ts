const pkg = require('../package.json')

const detailsStyle = 'margin:12px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:10px 14px 12px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'
const tableStyle = 'width:100%;border-collapse:collapse;margin:8px 0;font-size:14px;'
const thTdStyle = 'border:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));padding:6px 10px;text-align:left;'
const thStyle = `${thTdStyle}background:var(--k-hover-bg, rgba(127, 127, 127, .08));font-weight:600;`

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export const usage = `
<h1>Koishi 插件：who-at-me-vincentzyu</h1>
<h2>📬 插件版本：v\${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-who-at-me-vincentzyu?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://npm-stat.com/charts.html?package=koishi-plugin-who-at-me-vincentzyu" target="_blank">
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
    <img src="https://img.shields.io/badge/Koishi%20Forum-12566-5546A3?style=for-the-badge&logo=\${KOISHI_LOGO_BASE64}&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
  <br>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b style="color: #12B7F5;">1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu" target="_blank">
    前往 Gitee README 获得更佳观感 →
    <i>https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu</i>
  </a>
</p>

<details style="\${detailsStyle}">
<summary style="\${summaryStyle}"><b style="color: #0284c7;">📸 效果预览与功能速览</b></summary>
<div style="\${detailsBodyStyle}">
  <p><b>✨ 核心功能：</b>自动监听群聊消息中的 <code>@</code> 提及并沉淀到数据库，支持随时分页查询最近谁提及了你，可按当前频道或全平台范围检索。</p>
  <p>
    <a href="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu/releases/download/preview/preview.png" target="_blank">
      <img src="https://gitee.com/vincent-zyu/koishi-plugin-who-at-me-vincentzyu/releases/download/preview/preview.png" alt="who-at-me 效果预览" style="max-width: 100%; border-radius: 6px; border: 1px solid var(--k-color-divider, rgba(127, 127, 127, .28)); box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
    </a>
  </p>
  <ul>
    <li><b>⚡ 实时捕获：</b>消息进入群聊即时解析并提取 @ 对象，不错过任何提醒。</li>
    <li><b>📑 灵活分页：</b>支持指定页码、每页显示条数（1~50条）和查询范围（当前频道 / 全平台）。</li>
    <li><b>🎭 三种形态：</b>支持纯文本、Puppeteer 高清卡片长图、OneBot 合并转发三种形式展示。</li>
    <li><b>🎨 深度定制：</b>支持 10 种渲染色调、自定义字体路径、截图清晰度倍率与页脚文案自定义。</li>
  </ul>
</div>
</details>

<details style="\${detailsStyle}">
<summary style="\${summaryStyle}"><b style="color: #16a34a;">📋 可用指令与参数选项</b></summary>
<div style="\${detailsBodyStyle}">
  <p>默认指令名称为 <code>who-at-me</code>，支持配置项 <code>commandName</code> 自定义。指令别名内置支持 <code>谁at我</code>，并可通过 <code>commandAlias</code>（默认 <code>谁艾特我</code>）进行修改。</p>
  <table style="\${tableStyle}">
    <tr>
      <th style="\${thStyle}">指令 / 选项</th>
      <th style="\${thStyle}">说明</th>
      <th style="\${thStyle}">示例</th>
    </tr>
    <tr>
      <td style="\${thTdStyle}"><code>who-at-me</code></td>
      <td style="\${thTdStyle}">查询当前用户最近在群聊中被 @ 的记录</td>
      <td style="\${thTdStyle}"><code>who-at-me</code> 或 <code>谁艾特我</code></td>
    </tr>
    <tr>
      <td style="\${thTdStyle}"><code>who-at-me &lt;targetUser&gt;</code></td>
      <td style="\${thTdStyle}">查询指定目标用户被 @ 的记录（支持 @提及 或 直接输入用户ID）</td>
      <td style="\${thTdStyle}"><code>who-at-me @小明</code></td>
    </tr>
    <tr>
      <td style="\${thTdStyle}"><code>-p, --page &lt;number&gt;</code></td>
      <td style="\${thTdStyle}">指定查询页码（从 1 开始，默认为 1）</td>
      <td style="\${thTdStyle}"><code>who-at-me -p 2</code></td>
    </tr>
    <tr>
      <td style="\${thTdStyle}"><code>-s, --pagesize &lt;number&gt;</code></td>
      <td style="\${thTdStyle}">指定每页显示记录条数（默认 10 条，上限 50 条）</td>
      <td style="\${thTdStyle}"><code>who-at-me -s 20</code></td>
    </tr>
    <tr>
      <td style="\${thTdStyle}"><code>-o, --only-this-channel</code></td>
      <td style="\${thTdStyle}">是否仅查询当前频道记录（默认 true，传 false 为全平台检索）</td>
      <td style="\${thTdStyle}"><code>who-at-me -o false</code></td>
    </tr>
  </table>
  <blockquote style="margin: 10px 0; padding: 8px 12px; border-left: 4px solid #16a34a; border-radius: 4px; background: rgba(22, 163, 74, 0.1);">
    <b>💡 组合技巧：</b>当消息很多时，可以组合使用如 <code>谁艾特我 -p 1 -s 30 -o false</code>，快速总览全平台最近 30 条被提及的消息。
  </blockquote>
</div>
</details>

<details style="\${detailsStyle}">
<summary style="\${summaryStyle}"><b style="color: #d97706;">🎨 三种输出形态与图片高级渲染</b></summary>
<div style="\${detailsBodyStyle}">
  <p>在配置项 <code>messageForm</code> 中可选择输出形态：</p>
  <ul>
    <li><b>📝 文本模式 (text)：</b>纯文本格式直接回复，零依赖、速度极快，适用于所有平台与极简环境。</li>
    <li><b>🖼️ 图片模式 (image)：</b>基于 Puppeteer 渲染优雅的现代感卡片图（推荐）。</li>
    <li><b>📎 合并转发 (forward)：</b>以消息节点合并转发形式发出，界面整洁不刷屏（目前主要支持 OneBot 协议）。</li>
  </ul>

  <h4>🖼️ 图片模式个性化定制项</h4>
  <ul>
    <li><b>🎨 10 项主题配色 (renderColors)：</b>支持自由定制主强调色 (primary)、页面背景 (pageBackground)、卡片背景 (cardBackground)、卡片边框 (cardBorder)、主要文字 (textPrimary)、次要文字 (textSecondary)、分割线 (divider)、消息作者名称 (authorName)、作者高亮背景 (authorBackground) 以及页脚文字颜色 (footerText)。</li>
    <li><b>🔤 自定义字体路径 (textFontPath)：</b>可指定服务器本地的 TTF / OTF / WOFF 字体文件绝对路径，插件将自动读取并以 Base64 方式注入样式表中，彻底摆脱跨平台中文字体缺失问题。</li>
    <li><b>🔍 设备缩放比 (deviceScaleFactor)：</b>支持设置 0.5 ~ 5.0 的渲染缩放倍率（默认 2.5），在高 DPI 下生成如视网膜屏般锐利清晰的高清长图。</li>
    <li><b>📦 图片格式与质量 (imageType & screenshotQuality)：</b>支持 <code>png</code>、<code>jpeg</code>、<code>webp</code>。当长图过大时，可选用 <code>jpeg</code> / <code>webp</code> 并配合 1~100 质量调节以大幅缩减体积。</li>
    <li><b>✨ 自定义页脚文案 (imageFooterText)：</b>可自由配置图片底部的专属说明文案，默认展示 <code>✨ Generated by koishi-plugin-who-at-me-vincentzyu</code>。</li>
  </ul>
</div>
</details>

<details style="\${detailsStyle}">
<summary style="\${summaryStyle}"><b style="color: #7c3aed;">🗄️ 数据库机制、时间戳与历史迁移</b></summary>
<div style="\${detailsBodyStyle}">
  <p><b>📥 消息监听中间件：</b>通过配置项 <code>usePrependMiddleware</code> 可选择注册为前置中间件还是普通中间件，确保在其他插件拦截或处理消息前优先捕获到群聊中的 @ 事件。</p>
  
  <p><b>🗃️ 隔离数据表：</b></p>
  <ul>
    <li><code>who_at_me_vincentzyu_messages</code>：存储被提及消息的文本主体、发送者、平台与毫秒时间戳。</li>
    <li><code>who_at_me_vincentzyu_mentions</code>：存储 @ 关系映射（频道、被艾特用户 ID、原作者 ID）。</li>
  </ul>

  <p><b>⏱️ 64 位时间戳兼容：</b>表结构在底层采用 <code>bigint</code> 存储毫秒时间戳，全面杜绝 PostgreSQL 等严格数据库中 32 位整型溢出问题；同时在上层查询与排序中做自动数值安全映射，确保无论是 SQLite 还是 PostgreSQL 均能平稳流畅运作。</p>

  <p><b>📦 历史数据迁移脚本：</b>插件源码目录中附带了 <code>scripts/migrate_who_at_me_tables_20260705.py</code>，方便从早期未加前缀的旧表（<code>who_at_me_messages</code> / <code>who_at_me_mentions</code>）无缝迁移历史记录到带插件作用域的新表中。</p>
</div>
</details>
`
