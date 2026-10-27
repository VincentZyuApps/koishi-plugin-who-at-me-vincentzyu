import { Context, Session } from 'koishi'

// Koishi 4.18's Minato types do not yet represent the runtime PostgreSQL bigint type.
const postgresBigint = 'bigint' as any

export const MESSAGE_TABLE = 'who_at_me_vincentzyu_messages' as const
export const MENTION_TABLE = 'who_at_me_vincentzyu_mentions' as const

declare module 'koishi' {
  interface Tables {
    who_at_me_vincentzyu_messages: {
      id: string
      platform: string
      messageId: string
      userId: string
      content: string
      timestamp: number | bigint
    }
    who_at_me_vincentzyu_mentions: {
      id: string
      messageId: string
      platform: string
      channelId: string
      mentionedUserId: string
      authorUserId: string
    }
  }
}

export function setupDatabase(ctx: Context) {
  ctx.model.extend(MESSAGE_TABLE, {
    id: 'string',
    messageId: 'string',
    userId: 'string',
    platform: 'string',
    content: 'text',
    timestamp: postgresBigint,
  }, {
    primary: 'messageId',
  })

  ctx.model.extend(MENTION_TABLE, {
    id: 'string',
    messageId: 'string',
    platform: 'string',
    channelId: 'string',
    mentionedUserId: 'string',
    authorUserId: 'string',
  }, {
    primary: ['messageId', 'platform', 'mentionedUserId', 'authorUserId'],
  })
}

export function createSaveAtDbMiddleware(ctx: Context, config: any) {
  return async function saveAtDbFunc(session: Session, next: Function) {
    if (session.elements.some(element => element.type === 'at')) {
      const { platform, messageId, channelId, userId, content, timestamp } = session;

      if (!platform || !messageId || !content || !timestamp) {
        console.error('无法处理包含 @ 的消息：缺少必要字段。');
        return next();
      }

      try {
        await ctx.database.upsert(MESSAGE_TABLE, [{
          platform,
          messageId,
          userId,
          content,
          timestamp,
        }]);

        const mentions = session.elements.filter(e => e.type === 'at');
        const mentionRecords = [];

        for (const mention of mentions) {
          if (mention.type === 'at' && mention.attrs.id) {
            mentionRecords.push({
              platform,
              messageId,
              channelId,
              mentionedUserId: mention.attrs.id,
              authorUserId: session.userId,
            });
          }
        }

        await ctx.database.upsert(MENTION_TABLE, mentionRecords);

        if (config.enableVerboseConsoleLog)
          ctx.logger.info(`已记录包含 @ 的消息: ${messageId}`);
      } catch (e) {
        ctx.logger.error('存储 @ 消息时出错:', e);
      }
    }
    return next();
  };
}
