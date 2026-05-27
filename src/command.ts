import { Context, h, Logger } from "koishi";
import { ELEMENT_TYPE_MAP, MESSSAGE_FORM, AtMentionRecord, PaginatedResult } from "./type";
import { formatWhoAtMeAsImage, parseMessageContent, getAtMentionRecords } from "./render-pptr";

export function who_at_me(ctx: Context, config: any) {
  const whoAtMeLogger = new Logger('who-at-me-command');

  ctx.command('who-at-me [targetUser:text]', '查询最近谁@了我')
    .alias('谁艾特我')
    .option('page', '-p, --page <page:number> 页码，从1开始', { fallback: config.defaultPage || 1 })
    .option('pagesize', '-s, --pagesize <pagesize:number> 每页显示条数', { fallback: config.defaultPageSize || 10 })
    .option('only_this_channel', '-o, --only-this-channel <only_this_channel:string> true:当前频道, false:全平台', { fallback: true })
    .action(async ({ session, options }, targetUser) => {

      let hintMsgId: string[] = [];

      try {
        // 验证参数

        let TARGET_USERID;
        if ( targetUser ){
          TARGET_USERID = getUserIdFromStr(targetUser);
        } else {
          TARGET_USERID = session.userId;
        }
        if ( config.enableVerboseConsoleLog)
          ctx.logger.info(`[debug] targetUser = ${TARGET_USERID}`);

        const page = Math.max(1, options.page || config.defaultPage || 1);
        const pageSize = Math.max(1, Math.min(50, options.pagesize || config.defaultPageSize || 10)); // 限制最大50条

        // 根据参数决定是否传递channelId
        const ONLY_THIS_CHANNEL = options.only_this_channel==='false' ? false : true;
        const queryChannelId = ONLY_THIS_CHANNEL ? session.channelId : null;
        const scopeText = ONLY_THIS_CHANNEL? '当前频道' : '全平台';

        hintMsgId = await session.send(`${h.quote(session.messageId)}正在查询${scopeText}第${page}页@记录(每页${pageSize}条)，\n 目标用户: ${TARGET_USERID}, \n 请稍候...`);

        let whoAtMeMessage;

        if (config.messageForm === MESSSAGE_FORM.TEXT) {
          whoAtMeMessage = await formatWhoAtMeAsText(ctx, session, queryChannelId, TARGET_USERID, page, pageSize, whoAtMeLogger);
        } else if (config.messageForm === MESSSAGE_FORM.IMAGE) {
          whoAtMeMessage = await formatWhoAtMeAsImage(ctx, session, queryChannelId, TARGET_USERID, page, pageSize, whoAtMeLogger, config.textFontPath, config.renderColors, config.imageType, config.screenshotQuality);
        } else if (config.messageForm === MESSSAGE_FORM.FORWARD) {
          whoAtMeMessage = await formatWhoAtMeAsForward(ctx, session, queryChannelId, TARGET_USERID, page, pageSize, whoAtMeLogger);
        }

        await session.send(whoAtMeMessage);

      } catch (e) {
        const errMsg = `抱歉，查询@记录失败，请稍后再试。错误: ${e.message}`;
        whoAtMeLogger.error(errMsg);
        await session.send(errMsg);
      } finally {
        await session.bot.deleteMessage(session.channelId, hintMsgId[0]);
      }

    })

}

/**
 * 智能地从字符串中提取用户 ID。
 * 支持两种格式：
 * 1. Koishi <at id="..."/> 元素。
 * 2. 纯字母数字下划线用户 ID 字符串。
 *
 * @param input 需要解析的字符串。
 * @returns 提取到的用户 ID 字符串，如果未找到则返回 null。
 */
export function getUserIdFromStr(input: string): string | null {
  if (!input) {
    return null;
  }

  // 匹配字母、数字和下划线，使用 \w+
  // \w 等价于 [a-zA-Z0-9_]
  const regex = /(?:<at id="(\w+)"\/>|^(\w+)$)/;
  const match = input.match(regex);
  // 如果匹配成功，返回第一个有值的捕获组
  if (match) {
    return match[1] || match[2] || null;
  }
  return null;
}


async function formatWhoAtMeAsText(ctx: Context, session: any, channelId: string | null, targetUserId: string, page: number, pageSize: number, logger: Logger): Promise<Array<h>> {
  const result = await getAtMentionRecords(ctx, session.platform, targetUserId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return [h.quote(session.messageId), h.text(`${scopeText}查找不到有人@你的记录哦~`)];
    } else {
      return [h.quote(session.messageId), h.text(`第${page}页没有记录，总共${result.totalPages}页`)];
    }
  }

  let res: Array<any> = [];
  res.push(h.quote(session.messageId));
  const scopeText = channelId ? '当前频道' : '全平台';
  res.push(h.text(`${scopeText}第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条@记录):\n\n`));

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i];
    const date = new Date(record.timestamp).toLocaleString('zh-CN');
    const globalIndex = (result.currentPage - 1) * result.pageSize + i + 1;

    const authorUserObj = await session.bot.getGuildMember(session.guildId, record.userId);
    
    res.push( h.text(`------------------\n`) );
    res.push( h.text(`${globalIndex}. [${date}]\n`) );
    res.push( h.text(`消息作者: ${authorUserObj.user.name} (${authorUserObj.user.userId})${authorUserObj.nick ? ` (${authorUserObj.nick})` : ''}\n`) );
    res.push( ...(await parseMessageContent(ctx, session, record.content)) );
    res.push( h.text('\n\n') );
  }

  // 添加分页导航提示
  if (result.totalPages > 1) {
    res.push( h.text(`------------------\n`) );
    const onlyChannelFlag = channelId ? '' : ' --no-only-this-channel';
    if (result.hasPrev) {
      res.push( h.text(`上一页: who-at-me -p ${result.currentPage - 1} -s ${result.pageSize}${onlyChannelFlag}\n`) );
    }
    if (result.hasNext) {
      res.push( h.text(`下一页: who-at-me -p ${result.currentPage + 1} -s ${result.pageSize}${onlyChannelFlag}\n`) );
    }
  }

  return res;
}

async function formatWhoAtMeAsForward(ctx: Context, session: any, channelId: string | null, targetUserId: string, page: number, pageSize: number, logger: Logger): Promise<string> {
  const result = await getAtMentionRecords(ctx, session.platform, targetUserId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return `${scopeText}查找不到有人@你的记录哦~`;
    } else {
      return `第${page}页没有记录，总共${result.totalPages}页`;
    }
  }

  let messages = '';

  // Helper to add a message block with author and content
  const addMessageBlock = async (authorId: string | undefined, authorName: string, content: string) => {
    messages += `
      <message>
        <author ${authorId ? `id="${authorId}"` : ``} name="${authorName}"/>
        ${content}
      </message>`;
  };

  // First message: The title
  const scopeText = channelId ? '当前频道' : '全平台';
  await addMessageBlock(
    undefined,
    '谁@了我 记录查询:',
    `${scopeText}第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条@记录)`
  );

  // Subsequent messages: Each @mention record
  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i];
    const date = new Date(record.timestamp).toLocaleString('zh-CN');
    const globalIndex = (result.currentPage - 1) * result.pageSize + i + 1;

    const authorUserObj = await session.bot.getGuildMember(session.guildId, record.userId);

    let messageBlockContentArr = [
      `${globalIndex}. [${date}]\n`,
      `消息作者: ${authorUserObj.user.name} (${authorUserObj.user.userId})${authorUserObj.nick ? ` (${authorUserObj.nick})` : ''}\n\n`,
      `${(await parseMessageContent(ctx, session, record.content)).join('')}`
    ];

    await addMessageBlock(
      authorUserObj.user.userId,
      `No.${i} ${authorUserObj.user.name}`,
      messageBlockContentArr.join('')
    );
  }

  // 添加分页导航消息
  if (result.totalPages > 1) {
    let navText = '';
    const onlyChannelFlag = channelId ? '' : ' --no-only-this-channel';
    if (result.hasPrev) {
      navText += `上一页: who-at-me -p ${result.currentPage - 1} -s ${result.pageSize}${onlyChannelFlag}\n`;
    }
    if (result.hasNext) {
      navText += `下一页: who-at-me -p ${result.currentPage + 1} -s ${result.pageSize}${onlyChannelFlag}`;
    }
    if (navText) {
      await addMessageBlock(undefined, '分页导航', navText);
    }
  }

  return `<message forward>\n${messages}\n</message>`;
}