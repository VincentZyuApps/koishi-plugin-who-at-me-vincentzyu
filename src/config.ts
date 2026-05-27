import { Schema } from 'koishi'
import { MESSSAGE_FORM, IMAGE_TYPES, ImageType } from './type'


// ==========================================================================
// 🧩 插件配置项
// 以下配置决定 who-at-me (谁艾特我) 插件的行为
// ==========================================================================
export interface RenderColors {
  primaryColor: string
  bgColor: string
  cardBgColor: string
  cardBorderColor: string
  mainTextColor: string
  subTextColor: string
  separatorColor: string
  authorTextColor: string
  authorBgColor: string
  footerTextColor: string
}

export const defaultColors: RenderColors = {
  primaryColor: '#52449e',
  bgColor: '#F0F0F0',
  cardBgColor: '#FFFFFF',
  cardBorderColor: '#E0E0E0',
  mainTextColor: '#333333',
  subTextColor: '#666666',
  separatorColor: '#CCCCCC',
  authorTextColor: '#52449e',
  authorBgColor: '#EEEBF5',
  footerTextColor: '#888888',
}

export const RenderColorsSchema = Schema.object({
  primaryColor: Schema.string().role('color').default('#52449e').description('🎨 主题色（标题、序号）'),
  bgColor: Schema.string().role('color').default('#F0F0F0').description('🖼️ 页面背景色'),
  cardBgColor: Schema.string().role('color').default('#FFFFFF').description('🃏 卡片背景色'),
  cardBorderColor: Schema.string().role('color').default('#E0E0E0').description('🔲 卡片边框色'),
  mainTextColor: Schema.string().role('color').default('#333333').description('📝 主要文字颜色'),
  subTextColor: Schema.string().role('color').default('#666666').description('📝 次要文字颜色（日期、作者ID等）'),
  separatorColor: Schema.string().role('color').default('#CCCCCC').description('➖ 分隔线颜色'),
  authorTextColor: Schema.string().role('color').default('#52449e').description('👤 作者名称文字颜色'),
  authorBgColor: Schema.string().role('color').default('#EEEBF5').description('👤 作者信息区背景色'),
  footerTextColor: Schema.string().role('color').default('#888888').description('📄 页脚文字颜色'),
})

export interface Config {
  // 📥 数据库监听
  enableMiddlewareSaveAtDb: boolean
  usePrependMiddleware: boolean

  // 🎯 指令配置
  enableWhoAtMeCommand: boolean
  messageForm: 'text' | 'image' | 'forward'
  enableTargetUserArg: boolean
  defaultPage: number
  defaultPageSize: number

  // 🖼️ Puppeteer渲染配置
  textFontPath: string
  imageType: ImageType
  screenshotQuality: number

  // 🎨 渲染颜色配置
  renderColors: RenderColors

  // 🐛 调试配置
  enableVerboseConsoleLog: boolean
}

export const Config = Schema.intersect([

  // ──────────────────────────────────────────────────────────────────────────
  // 📥 第一组：监听 @ 消息并存入数据库
  // ──────────────────────────────────────────────────────────────────────────
  Schema.object({
    enableMiddlewareSaveAtDb: Schema.boolean()
      .default(false)
      .description('✅ 启用中间件监听消息并存入数据库<br>💡 只有启用了，才能记录 @ 消息哦~'),
  }).description('📥 是否监听 @ 消息并存入数据库 捏？'),

  Schema.union([
    Schema.object({
      enableMiddlewareSaveAtDb: Schema.const(true).required(),
      usePrependMiddleware: Schema.boolean()
        .default(true)
        .description('🔄 是否使用 koishi 的前置中间件<br>📌 优先级：前置中间件 > 指令 > 普通中间件'),
    }),
    Schema.object({})
  ]),

  // ──────────────────────────────────────────────────────────────────────────
  // 🎯 第二组：who-at-me 指令配置
  // ──────────────────────────────────────────────────────────────────────────
  Schema.object({
    enableWhoAtMeCommand: Schema.boolean()
      .default(false)
      .description('🔘 是否启用 who-at-me 指令'),
  }).description('🎯 是否启用「谁艾特我」指令 捏？'),

  Schema.object({
    messageForm: Schema.union([
      Schema.const(MESSSAGE_FORM.TEXT).description('📝 文本消息'),
      Schema.const(MESSSAGE_FORM.IMAGE).description('🖼️ 图片消息（使用 Puppeteer 渲染）'),
      Schema.const(MESSSAGE_FORM.FORWARD).description('📎 合并转发消息 (⚠️仅支持onebot)'),
    ]).role('radio')
      .description('📤 Bot 输出「谁艾特我」记录时使用的消息格式'),
    enableTargetUserArg: Schema.boolean()
      .default(true)
      .description('👤 是否允许在参数中传入 @ 元素<br>🔍 用于查找指定用户的被 @ 记录'),
    defaultPage: Schema.number()
      .default(1)
      .min(1).step(1)
      .description('📄 默认查看的页码'),
    defaultPageSize: Schema.number()
      .default(50)
      .min(5).max(1000).step(1)
      .description('📏 默认每页显示的记录数（最多 1000 条）'),
  }).description('📋 指令详细配置'),

  // ──────────────────────────────────────────────────────────────────────────
  // 🖼️ 第三组：Puppeteer 图片渲染配置
  // ──────────────────────────────────────────────────────────────────────────
  Schema.object({
    textFontPath: Schema.string()
      .default('G:\\GGames\\Minecraft\\shuyeyun\\qq-bot\\ledao\\koishi-ledao-dev\\external\\awa-quote-image\\assets\\LXGWWenKaiMono-Regular.ttf')
      .role('textarea', { rows: [2, 5] })
      .description('🔤 自定义字体文件路径, 给Puppeteer出图用的（绝对路径，留空则使用系统默认字体）'),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整 quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整 quality`),
      Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整 quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.JPEG)
      .description('📤 Puppeteer 截图输出格式'),
    screenshotQuality: Schema
      .number()
      .role('slider')
      .min(0).max(100).step(0.1)
      .default(50)
      .description('🎚️ Puppeteer 截图质量 [0-100]，对 PNG 无效'),
  }).description('🖼️ Puppeteer 图片渲染配置'),

  // ──────────────────────────────────────────────────────────────────────────
  // 🎨 第四组：渲染颜色设置
  // ──────────────────────────────────────────────────────────────────────────
  Schema.object({
    renderColors: RenderColorsSchema,
  }).role('table').default({ renderColors: defaultColors }).description('🎨 渲染颜色设置'),

  // ──────────────────────────────────────────────────────────────────────────
  // 🐛 第六组：调试配置
  // ──────────────────────────────────────────────────────────────────────────
  Schema.object({
    enableVerboseConsoleLog: Schema.boolean()
      .default(false)
      .description('📋 是否在控制台打印更多日志<br>⚠️ 仅供调试时使用，平时请勿开启'),
  }).description('🐛 调试配置')

]) as unknown as Schema<Config>
