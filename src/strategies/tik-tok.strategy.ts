import { Logger } from "pino";
import { Context } from "telegraf";
import { Strategy } from "../interfaces/strategy";
import { replyWithVideo } from "../utils";
const { TikTok } = require("social-downloader-sdk");

export default class TikTokStrategy implements Strategy {
  name = "TikTok";

  shorteners = [/https:\/\/vm\.tiktok\.com\/(.*)\//];

  urls = [
    /https?:\/\/(?:(?:www|m)\.(?:tiktok.com)\/(?:v|video|@.*\/video)\/(?:\d*))/,
  ];

  async execute(
    url: RegExpMatchArray,
    ctx: Context,
    logger: Logger
  ): Promise<void> {
    const resp = await TikTok.getVideo(url[0]);

    if (resp.data.hasError) {
      logger.error(resp.data.errorMessage);
      throw "Video not found";
    }

    await replyWithVideo(ctx, resp.data.body.video);
  }
}
