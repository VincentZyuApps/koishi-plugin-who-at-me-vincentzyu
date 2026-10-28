import { Logger } from 'koishi'
import type { GuildMemberCacheMode } from './config'

export interface ResolvedMember {
  name: string
  nick?: string
  userId: string
  isFallback: boolean
}

interface CacheItem {
  data: ResolvedMember
  expireAt: number
}

// 内存缓存 Map：key 格式为 `${platform}:${guildId}:${userId}`
const memberMemoryCache = new Map<string, CacheItem>()

// 默认 TTL 硬编码为 10 分钟
const DEFAULT_TTL_MS = 10 * 60 * 1000

/**
 * 安全获取群成员信息，提供异常捕获降级与三档内存防抖缓存
 */
export async function getGuildMemberSafe(
  session: any,
  guildId: string | null | undefined,
  userId: string,
  cacheMode: GuildMemberCacheMode = 'ttl',
  logger?: Logger
): Promise<ResolvedMember> {
  const targetGuildId = guildId || session.guildId || session.channelId || ''
  const platform = session.platform || 'unknown'
  const cacheKey = `${platform}:${targetGuildId}:${userId}`

  // 1. 尝试从缓存中获取
  if (cacheMode !== 'off') {
    const cached = memberMemoryCache.get(cacheKey)
    if (cached) {
      if (cacheMode === 'permanent' || Date.now() < cached.expireAt) {
        return cached.data
      } else {
        memberMemoryCache.delete(cacheKey)
      }
    }
  }

  // 2. 调用协议端接口获取
  let result: ResolvedMember
  try {
    const member = await session.bot.getGuildMember(targetGuildId, userId)
    const name = member?.user?.name || member?.nick || `用户(${userId})`
    result = {
      name,
      nick: member?.nick,
      userId: member?.user?.userId || userId,
      isFallback: false,
    }
  } catch (err: any) {
    if (logger) {
      logger.debug(`[who-at-me] 获取群成员失败 (${targetGuildId}, ${userId}): ${err?.message || err}，已安全降级`)
    }
    result = {
      name: `用户(${userId})`,
      nick: undefined,
      userId,
      isFallback: true,
    }
  }

  // 3. 写入内存缓存
  if (cacheMode !== 'off') {
    memberMemoryCache.set(cacheKey, {
      data: result,
      expireAt: cacheMode === 'permanent' ? Infinity : Date.now() + DEFAULT_TTL_MS,
    })
  }

  return result
}
