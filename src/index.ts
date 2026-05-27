import { Context, h, Session } from 'koishi'
import { who_at_me } from './command'
export { Config } from './config'

export const name = 'who-at-me-vincentzyu'
export const inject = {
  required: ["database"],
  optional: ["puppeteer"]
};


// 定义第一个数据库表的类型：用于存储消息本体
declare module 'koishi' {
  interface Tables {
    // 消息数据表
    who_at_me_messages: {
      id: string
      platform: string
      messageId: string
      userId: string
      content: string
      timestamp: number
    }
    // @提及行为数据表
    who_at_me_mentions: {
      id: string
      messageId: string
      platform: string
      channelId: string
      mentionedUserId: string
      authorUserId: string
    }
  }
}

// 插件核心逻辑
export function apply(ctx: Context, config: any) {
  // 定义数据库表格
  // 使用 ctx.model.extend 来定义数据库模型
  ctx.model.extend('who_at_me_messages', {
    id: 'string', // Koishi 数据库会自动使用 'id' 作为主键，但你也可以定义自己的
    messageId: 'string', // 消息 ID
    userId: 'string',    // 发送消息的用户 ID
    platform: 'string',  // 平台 (如 'qq', 'discord' 等)
    content: 'string',   // 消息内容
    timestamp: 'integer', // 时间戳
  }, {
    primary: 'messageId',
  })

  // 定义第二个表格，用于存储 @ 行为
  ctx.model.extend('who_at_me_mentions', {
    id: 'string',
    messageId: 'string', // 消息 ID
    platform: 'string',  // 平台
    channelId: 'string', // 频道ID（如QQ群号）
    mentionedUserId: 'string',    // 被 @ 的用户 ID
    authorUserId: 'string',    // 消息的作者用户 ID
  }, {
    // primary为复合主键，由 platform, userId, messageId 组成
    primary: ['messageId', 'platform',  'mentionedUserId',  'authorUserId'],
  })

  // 2. 注册中间件，监听所有消息
  if (config.enableMiddlewareSaveAtDb) {
    ctx.middleware(saveAtDbFunc, config.usePrependMiddleware);
  }

  // 3. 注册who-at-me命令
  if (config.enableWhoAtMeCommand) {
    who_at_me(ctx, config);
  }

  async function saveAtDbFunc(session: Session, next) {
    if (session.elements.some(element => element.type === 'at')) {
      const { platform, messageId, channelId, userId, content, timestamp } = session;

      // 检查必需的字段是否存在，以确保数据完整性
      if (!platform || !messageId || !content || !timestamp) {
        console.error('无法处理包含 @ 的消息：缺少必要字段。');
        return next();
      }

      try {
        // 将消息本体存入第一个表格
        // upsert 会在记录存在时更新，不存在时创建
        await ctx.database.upsert('who_at_me_messages', [{
          platform,
          messageId,
          userId,
          content,
          timestamp,
        }]);

        // 遍历消息中的所有 @ 元素
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

        // 将 @ 行为批量存入第二个表格
        // 复合主键会防止同一个消息重复 @ 同一个人时产生重复记录
        await ctx.database.upsert('who_at_me_mentions', mentionRecords);

        if ( config.enableVerboseConsoleLog )
          ctx.logger.info(`已记录包含 @ 的消息: ${messageId}`);
      } catch (e) {
        ctx.logger.error('存储 @ 消息时出错:', e);
      }
    }
    return next();
  }

  // ctx.command('debug-get-guild-member')
  //   .action( async ( {session, options} ) => {
  //     const guildMemberObj = await session?.bot.getGuildMember(session?.guildId, session?.userId);
  //     const guildMemberStr = `guildMemberObj json: ${JSON.stringify(guildMemberObj)}`;
  //     ctx.logger.info(guildMemberStr);
  //     await session?.send(`${h.quote(session.messageId)} ${guildMemberStr}`);
  //   } );

}