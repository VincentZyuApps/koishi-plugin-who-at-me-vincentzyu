import { Context, h, Logger } from "koishi";
import { ELEMENT_TYPE_MAP, MESSSAGE_FORM } from "./type";
import { } from 'koishi-plugin-puppeteer';

export function who_at_me(ctx: Context, config: any) {
  const whoAtMeLogger = new Logger('who-at-me-command');

  ctx.command('who-at-me', '查询最近谁@了我')
    .alias('谁艾特我')
    .option('page', '-p, --page <page:number> 页码，从1开始', { fallback: config.defaultPage || 1 })
    .option('pagesize', '-s, --pagesize <pagesize:number> 每页显示条数', { fallback: config.defaultPageSize || 10 })
    .option('only_this_channel', '-o, --only-this-channel <only_this_channel:string> true:当前频道, false:全平台', { fallback: true })
    .action(async ({ session, options }) => {

      try {
        // 验证参数
        const page = Math.max(1, options.page || config.defaultPage || 1);
        const pageSize = Math.max(1, Math.min(50, options.pagesize || config.defaultPageSize || 10)); // 限制最大50条

        // 根据参数决定是否传递channelId
        const ONLY_THIS_CHANNEL = options.only_this_channel==='false' ? false : true;
        const queryChannelId = ONLY_THIS_CHANNEL ? session.channelId : null;
        const scopeText = ONLY_THIS_CHANNEL? '当前频道' : '全平台';
        
        const hintMsgId = await session.send(`${h.quote(session.messageId)}正在查询${scopeText}第${page}页@记录(每页${pageSize}条)，请稍候...`);

        let whoAtMeMessage;

        if (config.messageForm === MESSSAGE_FORM.TEXT) {
          whoAtMeMessage = await formatWhoAtMeAsText(ctx, session, queryChannelId, page, pageSize, whoAtMeLogger);
        } else if (config.messageForm === MESSSAGE_FORM.IMAGE) {
          whoAtMeMessage = await formatWhoAtMeAsImage(ctx, session, queryChannelId, page, pageSize, whoAtMeLogger);
        } else if (config.messageForm === MESSSAGE_FORM.FORWARD) {
          whoAtMeMessage = await formatWhoAtMeAsForward(ctx, session, queryChannelId, page, pageSize, whoAtMeLogger);
        }

        await session.send(whoAtMeMessage);
        await session.bot.deleteMessage(session.channelId, hintMsgId[0]);

      } catch (e) {
        const errMsg = `抱歉，查询@记录失败，请稍后再试。错误: ${e.message}`;
        whoAtMeLogger.error(errMsg);
        await session.send(errMsg);
      }

    })

}

interface AtMentionRecord {
  messageId: string;
  userId: string;
  content: string;
  timestamp: number;
  platform: string;
}

interface PaginatedResult {
  records: AtMentionRecord[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

async function getAtMentionRecords(ctx: Context, platform: string, userId: string, channelId: string | null, page: number, pageSize: number): Promise<PaginatedResult> {
  try {
    // 先从mentions表获取相关的messageId
    const mentionRecords = await ctx.database.get('who_at_me_mentions', {
      platform: platform,
      mentionedUserId: userId,
      ...( channelId ? { channelId: channelId } : {})
    });

    if (mentionRecords.length === 0) {
      return {
        records: [],
        totalCount: 0,
        currentPage: page,
        pageSize: pageSize,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    // 获取对应的消息内容
    const messageIds = mentionRecords.map(record => record.messageId);
    const messageRecords = await ctx.database.get('who_at_me_messages', {
      messageId: { $in: messageIds },
    });

    // 合并数据并按时间排序
    const allRecords: AtMentionRecord[] = messageRecords
      .map(message => ({
        messageId: message.messageId,
        userId: message.userId,
        content: message.content,
        timestamp: message.timestamp,
        platform: message.platform,
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序排列

    // 分页计算
    const totalCount = allRecords.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const records = allRecords.slice(startIndex, endIndex);

    return {
      records,
      totalCount,
      currentPage: page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  } catch (e) {
    throw new Error(`查询@记录失败: ${e.message}`);
  }
}

async function parseMessageContent(ctx: Context, session: any, content: string): Promise<any> {
  const elements = h.parse(content);
  // console.log(`[debug]elements = ${JSON.stringify(elements)}`);

  // let parsedContent = '';
  let resArr = []
  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];
    if (e.type === 'text') {
      resArr.push(e.attrs.content);
    } else if (e.type === 'at') {
      const userObj = await session.bot.getGuildMember(session.guildId, e.attrs.id);
      // console.log(`userObj = ${JSON.stringify(userObj)}`);
      resArr.push(`@${userObj.nick}`);
    } 
    // else if (e.type === 'face') {
    //   //onebot表情可以发送原始的，不是很占空间
    //   resArr.push(e); 
    //   // console.log(`face e = ${JSON.stringify(e)}`);
    // } 
    else {
      resArr.push(`[${e.type}]`);
    }
  }
  return (resArr);
}

async function formatWhoAtMeAsText(ctx: Context, session: any, channelId: string | null, page: number, pageSize: number, logger: Logger): Promise<Array<h>> {
  const result = await getAtMentionRecords(ctx, session.platform, session.userId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return [h.quote(session.messageId), h.text(`${scopeText}最近没有人@你哦~`)];
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
    res.push( h.text(`消息作者: ${authorUserObj.user.name} ${authorUserObj.nick ? `(${authorUserObj.nick})` : ''} (${authorUserObj.user.userId})\n`) );
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

async function formatWhoAtMeAsImage(ctx: Context, session: any, channelId: string | null, page: number, pageSize: number, logger: Logger): Promise<Array<h>> {
  const result = await getAtMentionRecords(ctx, session.platform, session.userId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return [h.quote(session.messageId), h.text(`${scopeText}最近没有人@你哦~`)];
    } else {
      return [h.quote(session.messageId), h.text(`第${page}页没有记录，总共${result.totalPages}页`)];
    }
  }

  if (!ctx.puppeteer) {
    throw new Error("Puppeteer 服务不可用。请确保已安装 koishi-plugin-puppeteer 插件。");
  }

  const page_puppeteer = await ctx.puppeteer.page();
  try {
    const htmlContent = await getWhoAtMeImageHtmlTemplate(ctx, session, result, channelId);

    await page_puppeteer.setViewport({ width: 700, height: 1 });
    await page_puppeteer.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const cardElement = await page_puppeteer.$('.card');
    const boundingBox = await cardElement?.boundingBox();

    if (!boundingBox) {
      throw new Error('无法获取卡片元素的边界框。');
    }

    const screenshot = await page_puppeteer.screenshot({
      type: 'png',
      encoding: 'base64',
      clip: boundingBox
    });

    let res: Array<any> = [];
    res.push(h.quote(session.messageId));
    const scopeText = channelId ? '当前频道' : '全平台';
    res.push(h.text(`${scopeText}第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条@记录):\n`));
    res.push(h.image(`data:image/png;base64,${screenshot}`));

    // 添加分页导航提示
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
        res.push(h.text(navText));
      }
    }

    return res;
  } finally {
    await page_puppeteer.close();
  }
}

async function formatWhoAtMeAsForward(ctx: Context, session: any, channelId: string | null, page: number, pageSize: number, logger: Logger): Promise<string> {
  const result = await getAtMentionRecords(ctx, session.platform, session.userId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return `${scopeText}最近没有人@你哦~`;
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
      `消息作者: ${authorUserObj.user.name} ${authorUserObj.nick ? `(${authorUserObj.nick})` : ''} (${authorUserObj.user.userId})\n\n`,
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

async function getRecordItemsHtml(ctx: Context, session: any, records: AtMentionRecord[], currentPage: number, pageSize: number): Promise<string> {
  const htmlPromises = records.map(async (record, index) => {
    const date = new Date(record.timestamp).toLocaleString('zh-CN');
    const globalIndex = (currentPage - 1) * pageSize + index + 1;
    
    // 获取作者信息
    const authorUserObj = await session.bot.getGuildMember(session.guildId, record.userId);
    const authorName = authorUserObj.user.name;
    const authorNick = authorUserObj.nick;
    const authorUserId = authorUserObj.user.userId;
    
    return `
      <div class="record-item">
        <div class="record-header">
          <span class="record-number">${globalIndex}.</span>
          <span class="record-date">[${date}]</span>
        </div>
        <div class="author-info">
          <span class="author-label">消息作者:</span>
          <span class="author-name">${authorName}</span>
          ${authorNick ? `<span class="author-nick">(${authorNick})</span>` : ''}
          <span class="author-id">(${authorUserId})</span>
        </div>
        <p class="record-content">${(await parseMessageContent(ctx, session, record.content)).join('')}</p>
      </div>
    `;
  });

  return (await Promise.all(htmlPromises)).join('');
}

async function getWhoAtMeImageHtmlTemplate(ctx: Context, session: any, result: PaginatedResult, channelId: string | null): Promise<string> {
  const colors = {
    bg: '#f0f0f0',
    cardBg: 'rgba(255, 255, 255, 0.7)',
    cardBorder: 'rgba(0, 0, 0, 0.1)',
    cardShadow: 'rgba(0, 0, 0, 0.15)',
    mainText: '#333',
    subText: '#666',
    titleColor: '#3d5c9e',
    separator: 'rgba(0, 0, 0, 0.2)',
    recordSeparator: 'rgba(0, 0, 0, 0.1)',
    footerText: '#888',
    authorText: '#2c5aa0',
    authorBg: 'rgba(60, 92, 158, 0.1)',
  };

  const scopeText = channelId ? '当前频道' : '全平台';

  return `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body{font-family:'Inter','Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;margin:0;padding:30px;background:${colors.bg};color:${colors.mainText}}
        .card{max-width:600px;margin:0 auto;border-radius:20px;overflow:hidden;background:${colors.cardBg};backdrop-filter:blur(15px)saturate(160%);-webkit-backdrop-filter:blur(15px)saturate(160%);border:1px solid ${colors.cardBorder};box-shadow:0 10px 30px ${colors.cardShadow};padding:25px;display:flex;flex-direction:column;gap:20px}
        .header{text-align:center;border-bottom:2px solid ${colors.separator};padding-bottom:15px}
        .title{font-size:2.2em;font-weight:700;margin:0;color:${colors.titleColor}}
        .subtitle{font-size:1.1em;color:${colors.subText};margin-top:5px}
        .pagination-info{font-size:0.9em;color:${colors.subText};margin-top:5px}
        .record-item{display:flex;flex-direction:column;gap:8px;padding-bottom:15px;border-bottom:1px solid ${colors.recordSeparator}}
        .record-item:last-child{border-bottom:none;padding-bottom:0}
        .record-header{display:flex;align-items:center;gap:10px;margin-bottom:5px}
        .record-number{font-weight:700;color:${colors.titleColor};font-size:1.2em}
        .record-date{font-size:0.9em;color:${colors.subText}}
        .author-info{display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px 10px;background:${colors.authorBg};border-radius:6px;font-size:0.9em}
        .author-label{color:${colors.subText};font-weight:600}
        .author-name{color:${colors.authorText};font-weight:600}
        .author-nick{color:${colors.authorText};font-style:italic}
        .author-id{color:${colors.subText};font-family:monospace;font-size:0.85em}
        .record-content{font-size:1.1em;line-height:1.6;color:${colors.mainText};margin:0;word-wrap:break-word}
        .footer{text-align:center;font-size:0.9em;color:${colors.footerText};margin-top:10px}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">谁@了我</div>
          <div class="subtitle">${scopeText}@记录查询</div>
          <div class="pagination-info">第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条记录)</div>
        </div>
        <div class="record-list">
          ${await getRecordItemsHtml(ctx, session, result.records, result.currentPage, result.pageSize)}
        </div>
        <div class="footer">
          powered by koishi-plugin-who-at-me
        </div>
      </div>
    </body>
    </html>
  `;
}