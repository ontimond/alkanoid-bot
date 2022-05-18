if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

import axios from "axios";
import { Telegraf } from "telegraf";
import { logger } from "./logger";
import { Strategies } from "./strategies";

const bot = new Telegraf(process.env.BOT_TOKEN || "", {
  handlerTimeout: 9_000_000,
});

logger.info("Strategies loaded");

bot.start((ctx) =>
  ctx.reply("Welcome! Send me a link and I'll try to download it for you.")
);

bot.hears(Strategies.getAllRegEx(), async (ctx) => {
  let downloadMessage;
  let url = ctx.match[0];

  let loggerCtx = logger.child({
    url,
  });

  if (Strategies.isShortener(url)) {
    loggerCtx.info("Shortener detected");
    // Follow redirects
    url = (await axios.get(url)).request.res.responseUrl;
  }

  try {
    const strategy = Strategies.getStrategyByUrl(url);

    if (strategy) {
      loggerCtx = loggerCtx.child({
        strategy: strategy.name,
        url,
      });
      loggerCtx.info("Strategy found");
      downloadMessage = await ctx.reply("Downloading video...", {
        disable_notification: true,
      });
      await strategy.execute(ctx.match, ctx, loggerCtx);
    } else {
      loggerCtx.warn("No strategy found");
    }
  } catch (e) {
    loggerCtx.error(e);
  } finally {
    if (downloadMessage) ctx.deleteMessage(downloadMessage.message_id);
  }
});

bot.command("quit", async (ctx) => {
  try {
    ctx.reply("Bye!");
    await ctx.leaveChat();
  } catch (error) {
    console.error(error);
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
