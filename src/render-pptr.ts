import { Context, h, Logger } from "koishi";
import { } from 'koishi-plugin-puppeteer';
import { AtMentionRecord, PaginatedResult } from "./type";
import { RenderColors, defaultColors } from "./config";
import fs from 'fs';
import path from 'path';

export async function parseMessageContent(ctx: Context, session: any, content: string): Promise<any> {
  const elements = h.parse(content);

  let resArr = []
  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];
    if (e.type === 'text') {
      resArr.push(e.attrs.content);
    } else if (e.type === 'at') {
      const userObj = await session.bot.getGuildMember(session.guildId, e.attrs.id);
      console.log(`userObj = ${JSON.stringify(userObj)}`);
      resArr.push(`@${userObj.nick ? userObj.nick : userObj.user.name}`);
    }
    else {
      resArr.push(`[${e.type}]`);
    }
  }
  return (resArr);
}

async function getRecordItemsHtml(ctx: Context, session: any, records: AtMentionRecord[], currentPage: number, pageSize: number): Promise<string> {
  const htmlPromises = records.map(async (record, index) => {
    const date = new Date(record.timestamp).toLocaleString('zh-CN');
    const globalIndex = (currentPage - 1) * pageSize + index + 1;
    
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
          <span class="author-id">(${authorUserId})</span>
          ${authorNick ? `<span class="author-nick">(${authorNick})</span>` : ''}
        </div>
        <p class="record-content">${(await parseMessageContent(ctx, session, record.content)).join('')}</p>
      </div>
    `;
  });

  return (await Promise.all(htmlPromises)).join('');
}

export async function getAtMentionRecords(ctx: Context, platform: string, userId: string, channelId: string | null, page: number, pageSize: number): Promise<PaginatedResult> {
  try {
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

    const messageIds = mentionRecords.map(record => record.messageId);
    const messageRecords = await ctx.database.get('who_at_me_messages', {
      messageId: { $in: messageIds },
    });

    const allRecords: AtMentionRecord[] = messageRecords
      .map(message => ({
        messageId: message.messageId,
        userId: message.userId,
        content: message.content,
        timestamp: message.timestamp,
        platform: message.platform,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

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

function loadFontBase64(fontPath: string): { fontBase64: string; fontName: string } {
  const result = { fontBase64: '', fontName: 'Inter' };
  if (!fontPath) return result;
  try {
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      result.fontBase64 = fontBuffer.toString('base64');
      result.fontName = path.basename(fontPath, path.extname(fontPath));
    }
  } catch (e) {
    console.error('读取字体文件失败:', e, '路径:', fontPath);
  }
  return result;
}

async function getWhoAtMeImageHtmlTemplate(ctx: Context, session: any, result: PaginatedResult, channelId: string | null, textFontPath: string, colors: RenderColors): Promise<string> {
  const scopeText = channelId ? '当前频道' : '全平台';

  const { fontBase64, fontName } = loadFontBase64(textFontPath);
  const fontFaceDecl = fontBase64
    ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}`
    : '';
  const fontFamily = fontBase64 ? `'${fontName}',` : '';

  return `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${fontFaceDecl}
        body{font-family:${fontFamily}'Inter','Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;margin:0;padding:30px;background:${colors.bgColor};color:${colors.mainTextColor}}
        .card{max-width:600px;margin:0 auto;border-radius:20px;overflow:hidden;padding:25px;display:flex;flex-direction:column;gap:20px}
        .header{text-align:center;border-bottom:2px solid ${colors.separatorColor};padding-bottom:15px}
        .title{font-size:2.2em;font-weight:700;margin:0;color:${colors.primaryColor}}
        .subtitle{font-size:1.1em;color:${colors.subTextColor};margin-top:5px}
        .pagination-info{font-size:0.9em;color:${colors.subTextColor};margin-top:5px}
        .record-item{display:flex;flex-direction:column;gap:8px;padding-bottom:15px;border-bottom:1px solid ${colors.separatorColor}}
        .record-item:last-child{border-bottom:none;padding-bottom:0}
        .record-header{display:flex;align-items:center;gap:10px;margin-bottom:5px}
        .record-number{font-weight:700;color:${colors.primaryColor};font-size:1.2em}
        .record-date{font-size:0.9em;color:${colors.subTextColor}}
        .author-info{display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px 10px;background:${colors.authorBgColor};border-radius:6px;font-size:0.9em;overflow:hidden}
        .author-label{color:${colors.subTextColor};font-weight:600;flex-shrink:0}
        .author-name{color:${colors.authorTextColor};font-weight:600;flex-shrink:0}
        .author-nick{color:${colors.authorTextColor};font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .author-id{color:${colors.subTextColor};font-family:${fontFamily}monospace;font-size:0.85em;flex-shrink:0}
        .record-content{font-size:1.1em;line-height:1.6;color:${colors.mainTextColor};margin:0;word-wrap:break-word}
        .footer{text-align:center;font-size:0.9em;color:${colors.footerTextColor};margin-top:10px}
      </style>
    </head>
    <body>
      <div class="card" style="background:${colors.cardBgColor};backdrop-filter:blur(15px)saturate(160%);-webkit-backdrop-filter:blur(15px)saturate(160%);border:1px solid ${colors.cardBorderColor};box-shadow:0 10px 30px rgba(0,0,0,0.15)">
        <div class="header">
          <div class="title">谁@了我</div>
          <div class="subtitle">${scopeText}@记录查询</div>
          <div class="pagination-info">第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条记录)</div>
        </div>
        <div class="record-list">
          ${await getRecordItemsHtml(ctx, session, result.records, result.currentPage, result.pageSize)}
        </div>
        <div class="footer">
          Generated by koishi-plugin-who-at-me-vincentzyu
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function formatWhoAtMeAsImage(ctx: Context, session: any, channelId: string | null, targetUserId: string, page: number, pageSize: number, logger: Logger, textFontPath?: string, renderColors?: RenderColors): Promise<Array<h>> {
  const result = await getAtMentionRecords(ctx, session.platform, targetUserId, channelId, page, pageSize);

  if (result.records.length === 0) {
    if (result.totalCount === 0) {
      const scopeText = channelId ? '当前频道' : '全平台';
      return [h.quote(session.messageId), h.text(`${scopeText}查找不到有人@你的记录哦~`)];
    } else {
      return [h.quote(session.messageId), h.text(`第${page}页没有记录，总共${result.totalPages}页`)];
    }
  }

  if (!ctx.puppeteer) {
    throw new Error("Puppeteer 服务不可用。请确保已安装 koishi-plugin-puppeteer 插件。");
  }

  const page_puppeteer = await ctx.puppeteer.page();
  try {
    const htmlContent = await getWhoAtMeImageHtmlTemplate(ctx, session, result, channelId, textFontPath || '', renderColors || defaultColors);

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
