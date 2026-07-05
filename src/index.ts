import { Context } from 'koishi'

import { who_at_me } from './command'
import { ensureDefaultFont } from './fonts'
import { setupDatabase, createSaveAtDbMiddleware } from './database'

export { usage } from './usage'
export { Config } from './config'

export const name = 'who-at-me-vincentzyu'
export const inject = {
  required: ["database"],
  optional: ["puppeteer"]
};

export function apply(ctx: Context, config: any) {
  setupDatabase(ctx);

  const logger = ctx.logger(name);
  ensureDefaultFont(ctx, logger).catch((error) => {
    ctx.logger.warn(`⚠️ who-at-me 默认字体 apply 阶段预检查失败，将在渲染时重试: ${error?.message || error}`);
  });

  if (config.enableMiddlewareSaveAtDb) {
    ctx.middleware(createSaveAtDbMiddleware(ctx, config), config.usePrependMiddleware);
  }

  if (config.enableWhoAtMeCommand) {
    who_at_me(ctx, config);
  }
}
