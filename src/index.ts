require("dotenv").config();
import { Context, Telegraf } from "telegraf";
const {
  Facebook,
  Instagram,
  TikTok,
  YouTube,
} = require("social-downloader-sdk");
const turl = require("turl");
const instareel = require("insta-reel");
import axios from "axios";

const bot = new Telegraf(process.env.BOT_TOKEN || "", {
  handlerTimeout: 9_000_000,
});

const sanitizeUrl = async (url: string) => {
  const urlClass = new URL(url);
  urlClass.searchParams.delete("dl");
  const shortenUrl = await turl.shorten(urlClass.href);
  return shortenUrl;
};

type SocialType = {
  name: string;
  urls: (string | RegExp)[];
  strategy: (url: string, ctx: Context) => Promise<void>;
};
type SocialTypes = {
  [key: string]: SocialType;
};

const social: SocialTypes = {
  facebook: {
    name: "Facebook",
    urls: [
      /^https:\/\/www.facebook.com\/watch\?v=([^&]*)/,
      /^https:\/\/www.facebook.com\/([^\/]*)\/videos\/([^\/]*)/,
      /(?:https?:\/\/)?(?:www.|web.|m.)?(facebook|fb).(com|watch)\/(?:video.php\?v=\d+|(\S+)|photo.php\?v=\d+|\?v=\d+)|\S+\/videos\/((\S+)\/(\d+)|(\d+))\/?/,
    ],
    strategy: async (url: string, ctx: Context) => {
      if (url.includes("fb.watch")) {
        // Follow redirects to get the video id
        const res = await axios.get(url, {
          maxRedirects: 5,
          validateStatus: (status) => status === 200,
        });
        url = res.request.res.responseUrl;
      }

      // Extract video id from url
      const match = url.match(
        /facebook.com\/((\d*\/videos\/)|(reel\/)|(watch\?v=))(?<video_id>\d*)/i
      );
      if (match) {
        const video_id = match.groups?.video_id;
        // Replace url with mobile version
        // https://m.facebook.com/video.php?v=VIDEO_ID
        url = `https://m.facebook.com/video.php?v=${video_id}`;
      }

      const resp = await Facebook.getVideo(url);
      if (!resp.data.hasError) {
        const video = await sanitizeUrl(resp.data.body.video);

        console.log("Sending video to telegram...");
        await ctx.replyWithVideo(
          {
            url: video,
          },
          {
            reply_to_message_id: ctx.message?.message_id,
            caption: `${
              ctx.message?.from.username ?? ctx.message?.from.first_name
            } shared a video ${url}`,
          }
        );
      } else {
        console.log("Error: ", resp.data.errorMessage);
        throw resp.data.errorMessage;
      }
    },
  },
  instagramReel: {
    name: "Instagram reel",
    urls: [
      /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/reel\/([A-Za-z0-9-_]+)/im,
    ],
    strategy: async (url, ctx) => {
      const reel = await instareel(url);
      if (reel) {
        await ctx.replyWithVideo(
          {
            url: reel.video_url,
          },
          {
            reply_to_message_id: ctx.message?.message_id,
            caption: `${
              ctx.message?.from.username ?? ctx.message?.from.first_name
            } shared a video ${url}`,
          }
        );
      }
    },
  },
  instagramStories: {
    name: "Instagram stories",
    urls: [
      /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/([A-Za-z0-9-_]+)/im,
    ],
    strategy: async (url, ctx) => {
      const profile = url.match(
        /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/([A-Za-z0-9-_]+)/im
      )?.[1];

      const resp = await Instagram.getStories(profile);

      if (!resp.data.hasError) {
        const stories = await resp.data.body.stories.map(
          (story: any) => story.image_versions2?.candidates?.[0]
        );

        await stories.forEach(
          async (image: string) =>
            await ctx.replyWithPhoto(image, {
              caption: ctx.from?.first_name,
              reply_to_message_id: ctx.message?.message_id,
            })
        );
      }
    },
  },
  tiktok: {
    name: "TikTok",
    urls: [
      /https?:\/\/(?:(?:www|m)\.(?:tiktok.com)\/(?:v|video|@.*\/video)\/(?:\d*))/im,
    ],
    strategy: async (url, ctx) => {
      const resp = await TikTok.getVideo(url);
      if (!resp.data.hasError) {
        const video = await sanitizeUrl(resp.data.body.video);

        console.log("Sending video to telegram...");
        await ctx.replyWithVideo(
          {
            url: video,
          },
          {
            reply_to_message_id: ctx.message?.message_id,
            caption: `${
              ctx.message?.from.username ?? ctx.message?.from.first_name
            } shared a video ${url}`,
          }
        );
      } else {
        console.log("Error: ", resp.data.errorMessage);
      }
    },
  },
  youtube: {
    name: "Youtube",
    urls: [
      /^https:\/\/www.youtube.com\/watch\?v=([^&]*)/,
      /^https:\/\/youtu.be\/([^&]*)/,
    ],
    strategy: async (url, ctx) => {
      const resp = await YouTube.getVideo(url);
      if (!resp.data.hasError) {
        const video = await sanitizeUrl(resp.data.body.video);

        console.log("Sending video to telegram...");
        await ctx.replyWithVideo(
          {
            url: video,
          },
          {
            reply_to_message_id: ctx.message?.message_id,
            caption: `${
              ctx.message?.from.username ?? ctx.message?.from.first_name
            } shared a video ${url}`,
          }
        );
      } else {
        console.log("Error: ", resp.data.errorMessage);
      }
    },
  },
};

function getStrategy(url: string): SocialType | null {
  for (const strategy in social) {
    for (const regex of social[strategy].urls) {
      if (regex instanceof RegExp ? regex.test(url) : url.match(regex)) {
        return social[strategy];
      }
    }
  }
  return null;
}

bot.start((ctx) => ctx.reply("Welcome!"));

bot.hears(
  Object.values(social).flatMap(({ urls }) => urls),
  async (ctx) => {
    let downloadMessage;
    try {
      const strategy = getStrategy(ctx.message.text);
      const url = ctx.message.text;

      if (strategy) {
        downloadMessage = await ctx.reply(
          `🫠 Downloading ${strategy.name} video...`
        );
        console.log("url", url);
        console.log("strategy", strategy.name);
        await strategy.strategy(url, ctx);
        ctx.deleteMessage(downloadMessage.message_id);
      }
    } catch (e) {
      ctx.replyWithHTML(`<b>Error:</b> ${e}`, {
        reply_to_message_id: ctx.message?.message_id,
      });
      if (downloadMessage) {
        ctx.deleteMessage(downloadMessage.message_id);
      }
      console.log(e);
    }
  }
);
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
