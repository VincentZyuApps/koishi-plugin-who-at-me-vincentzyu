import { Context, Schema, Session } from 'koishi'
import { MESSSAGE_FORM } from './type'
import { who_at_me } from './command'

export const name = 'who-at-me'
export const inject = {
  required: ["database"],
  optional: ["puppeteer"]
};


export const Config = Schema.intersect([

  Schema.object({
    enableMiddlewareSaveAtDb: Schema.boolean()
      .default(false)
      .description('是否启用中间件监听消息并存入数据库 <br> 只有启用了 才能记录at消息哦~'),
  }).description('是否 监听at消息并存入数据库 捏？'),

  Schema.union([
    Schema.object({
      enableMiddlewareSaveAtDb: Schema.const(true).required(),
      usePrependMiddleware: Schema.boolean()
        .default(true)
        .description('是否使用koishi的前置中间件， <br> 优先级：前置中间件 > 指令 > 普通中间件'),
    }),
    Schema.object({})
  ]),

  
  Schema.object({
    enableWhoAtMeCommand: Schema.boolean()
      .default(false)
      .description('是否启用 who-at-me 指令'),
  }).description('是否 谁艾特我指令 捏？'),

  Schema.union([
    Schema.object({
      enableWhoAtMeCommand: Schema.const(true).required(),
      messageForm: Schema.union([
        Schema.const(MESSSAGE_FORM.TEXT).description('文本消息'),
        // Schema.const(MESSSAGE_FORM.TEXT_WITH_IMAGE).description('图文消息段混合消息'),
        Schema.const(MESSSAGE_FORM.IMAGE).description('图片消息'),
        Schema.const(MESSSAGE_FORM.FORWARD).description('合并转发消息(目前我已知支持的 好像只有onebot awa)'),
      ]).role('radio')
        .description('bot输出 谁艾特我记录的时候 使用的消息格式'),
      defaultPage: Schema.number()
        .default(1)
        .min(1).step(1)
        .description('默认查看的页数'),
      defaultPageSize: Schema.number()
        .default(10)
        .min(5).max(30).step(1)
        .description('默认每页显示的记录数，最多30条'),
    }),
    Schema.object({})
  ]),

  Schema.object({
    enableVerboseConsoleLog: Schema.boolean()
      .default(false)
      .description('是否在控制台打印更多日志， <br> 仅供调试时使用，平时请勿开启'),
  }).description('调试配置')

])

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

        ctx.logger.info(`已记录包含 @ 的消息: ${messageId}`);
      } catch (e) {
        ctx.logger.error('存储 @ 消息时出错:', e);
      }
    }
    return next();
  }

  // ctx.command('debug')
  //   .action( async ( {session, options} ) => {

  //     const userObj = await session.bot.getGuildMember(session.guildId, session.userId);
  //     userObj.nick

  //   } )


}