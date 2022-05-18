import { Logger } from "pino";
import { Context } from "telegraf";
import { facebookDownloader } from "../downloaders/facebook.downloader";
import { Strategy } from "../interfaces/strategy";
import { replyWithVideo } from "../utils";
const { Facebook } = require("social-downloader-sdk");

export default class FacebookStrategy implements Strategy {
  name = "Facebook";

  shorteners = [
    /^https:\/\/fb\.gg\/v\/([a-zA-Z0-9_\-]+)\/$/,
    /^https:\/\/fb\.watch\/([a-zA-Z0-9_\-]+)\/$/,
  ];

  urls = [
    /https:\/\/(www|m)\.facebook\.com\/watch\?v=(?<videoId>\d+)/,
    /https:\/\/www\.facebook\.com\/(\d+)\/videos\/(?<videoId>\d+)/,
  ];

  async execute(
    url: RegExpMatchArray,
    ctx: Context,
    logger: Logger
  ): Promise<void> {
    const videoId = url.groups?.videoId;

    if (!videoId) {
      logger.error("Video id not found");
      throw "Video id not found";
    } else {
      logger.info("Video id found - %s", videoId);
    }

    const facebookMobileUrl = `https://m.facebook.com/video.php?v=${videoId}`;
    const resp = await Facebook.getVideo(facebookMobileUrl);

    let videoUrl;
    if (resp.data.hasError) {
      videoUrl = await facebookDownloader(facebookMobileUrl);
      if (!videoUrl) {
        throw "Video not found";
      }
    } else {
      videoUrl = resp.data.body.video;
    }

    await replyWithVideo(ctx, videoUrl);
  }
}
