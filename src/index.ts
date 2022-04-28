require("dotenv").config();
import { Context, Telegraf } from "telegraf";
const { Facebook, Instagram } = require("social-downloader-sdk");
const turl = require("turl");

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
      // Example: https://www.facebook.com/100076156761151/videos/509943293907442
      /^https:\/\/www.facebook.com\/([^\/]*)\/videos\/([^\/]*)/,
    ],
    strategy: async (url: string, ctx: Context) => {
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
      }
    },
  },
  instagram: {
    name: "Instagram",
    urls: [
      /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/reel\/([^\/]*)/im,
      /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/p\/([^\/]*)/im,
      /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/tv\/([^\/]*)/im,
    ],
    strategy: (url) => {
      return Instagram.getAny(url);
    },
  },
  instagramProfile: {
    name: "Instagram Profile",
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

        stories.forEach((image: string) =>
          ctx.replyWithPhoto(image, {
            caption: ctx.from?.first_name,
            reply_to_message_id: ctx.message?.message_id,
          })
        );
      }
    },
  },
  youtube: {
    name: "Youtube",
    urls: [
      /^https:\/\/www.youtube.com\/watch\?v=([^&]*)/,
      /^https:\/\/youtu.be\/([^&]*)/,
    ],
    strategy: async (url) => {
      const media = await Facebook.getMedia(url);
      return media.url;
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
    try {
      const strategy = getStrategy(ctx.message.text);
      const url = ctx.message.text;

      if (strategy) {
        console.log("url", url);
        console.log("strategy", strategy.name);
        await strategy.strategy(url, ctx);
      }
    } catch (e) {
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
