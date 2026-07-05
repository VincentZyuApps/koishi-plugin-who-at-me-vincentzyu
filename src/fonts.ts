import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

import { Context, Logger } from 'koishi'

export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'

const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts'
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts'

export const LXGW_WENKAI_URL = `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}`

interface FontIntegrity {
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

interface FontDownloadSource {
  source: string
  url: string
}

const FONT_INTEGRITY: Record<string, FontIntegrity> = {
  [LXGW_WENKAI_FILE_NAME]: {
    size: 24755236,
    md5: '90e75a25cca0e8868977b880352c6a53',
    sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
    sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
    sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
  },
}

const FONT_DOWNLOAD_URLS: Record<string, FontDownloadSource[]> = {
  [LXGW_WENKAI_FILE_NAME]: [
    { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
    { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
  ],
}

export function getFontDirByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts')
}

export function getLxgwWenKaiPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), LXGW_WENKAI_FILE_NAME)
}

// ⚙️ Schema 默认值拿不到 ctx.baseDir，只能用 cwd 作为配置页展示 fallback。
// 运行时会映射回 ctx.baseDir/data/fonts。
export const DEFAULT_LXGW_WENKAI_PATH = getLxgwWenKaiPathByBaseDir(process.cwd())

function getCrossPlatformBasename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath
}

function getRuntimeManagedFontPath(baseDir: string, fileName: string): string | null {
  switch (fileName) {
    case LXGW_WENKAI_FILE_NAME:
      return getLxgwWenKaiPathByBaseDir(baseDir)
    default:
      return null
  }
}

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  }
}

function verifyFontIntegrity(filePath: string, expected: FontIntegrity): boolean {
  if (!fs.existsSync(filePath)) return false
  const buffer = fs.readFileSync(filePath)
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
}

function verifyFontBuffer(buffer: Buffer, expected: FontIntegrity): boolean {
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
}

async function downloadFontWithFallback(ctx: Context, logger: Logger, filePath: string, expected: FontIntegrity): Promise<void> {
  const candidates = FONT_DOWNLOAD_URLS[LXGW_WENKAI_FILE_NAME] || [{ source: 'Gitee', url: LXGW_WENKAI_URL }]
  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      logger.info(`📥 开始下载默认字体 (${candidate.source}): ${candidate.url}`)
      const response = await ctx.http.get(candidate.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      })
      const buffer = Buffer.from(response)
      if (!verifyFontBuffer(buffer, expected)) {
        throw new Error(`默认字体 hash 校验失败: ${LXGW_WENKAI_FILE_NAME}`)
      }

      await fs.promises.writeFile(filePath, buffer)
      if (!verifyFontIntegrity(filePath, expected)) {
        throw new Error(`默认字体写入后 hash 校验失败: ${LXGW_WENKAI_FILE_NAME}`)
      }

      logger.info(`✅ 默认字体下载完成，hash 校验通过 (${candidate.source}): ${filePath}`)
      return
    } catch (e) {
      lastError = e
      logger.warn(`⚠️ ${candidate.source} 默认字体下载或 hash 校验失败，准备尝试下一个源: ${e?.message || e}`)
    }
  }

  throw new Error(`默认字体下载失败，Gitee / GitHub 均不可用或校验失败: ${lastError instanceof Error ? lastError.message : lastError}`)
}

export async function ensureDefaultFont(ctx: Context, logger: Logger): Promise<string | null> {
  const fontDir = getFontDirByBaseDir(ctx.baseDir)
  const fontPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const expected = FONT_INTEGRITY[LXGW_WENKAI_FILE_NAME]

  if (verifyFontIntegrity(fontPath, expected)) {
    logger.info(`✅ 默认字体已存在且 hash 校验通过，跳过下载: ${fontPath}`)
    return fontPath
  }

  if (fs.existsSync(fontPath)) {
    logger.warn(`⚠️ 默认字体存在但 hash 校验失败，将重新下载: ${fontPath}`)
  }

  try {
    await fs.promises.mkdir(fontDir, { recursive: true })
    logger.info(`🔤 默认字体不存在或校验失败，开始下载到 Koishi 数据目录: ${fontPath}`)
    await downloadFontWithFallback(ctx, logger, fontPath, expected)
    return fontPath
  } catch (e) {
    logger.warn(`⚠️ 默认字体下载或 hash 校验失败，将使用系统字体: ${e?.message || e}`)
    return null
  }
}

export async function resolveRuntimeFontPath(ctx: Context, logger: Logger, configuredFontPath?: string): Promise<string | null> {
  const configured = configuredFontPath?.trim()
  const runtimeDefault = getLxgwWenKaiPathByBaseDir(ctx.baseDir)

  if (!configured) {
    return ensureDefaultFont(ctx, logger)
  }

  const fileName = getCrossPlatformBasename(configured)
  const managedRuntimePath = getRuntimeManagedFontPath(ctx.baseDir, fileName)
  if (managedRuntimePath || configured === DEFAULT_LXGW_WENKAI_PATH || configured === runtimeDefault) {
    return ensureDefaultFont(ctx, logger)
  }

  if (fs.existsSync(configured)) return configured

  logger.warn(`⚠️ 配置的字体文件不存在，回退默认字体: ${configured}`)
  return ensureDefaultFont(ctx, logger)
}
