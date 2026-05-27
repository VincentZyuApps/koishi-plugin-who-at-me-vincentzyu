import { Context } from 'koishi'
import { who_at_me } from './command'
export { Config } from './config'
export { usage } from './usage'
import { setupDatabase, createSaveAtDbMiddleware } from './database'

export const name = 'who-at-me-vincentzyu'
export const inject = {
  required: ["database"],
  optional: ["puppeteer"]
};

export function apply(ctx: Context, config: any) {
  setupDatabase(ctx);

  if (config.enableMiddlewareSaveAtDb) {
    ctx.middleware(createSaveAtDbMiddleware(ctx, config), config.usePrependMiddleware);
  }

  if (config.enableWhoAtMeCommand) {
    who_at_me(ctx, config);
  }
}