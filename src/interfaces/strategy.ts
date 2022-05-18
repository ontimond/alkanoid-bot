import { Logger } from "pino";
import { Context } from "telegraf";

export interface Strategy {
  name: string;
  shorteners: RegExp[];
  urls: RegExp[];
  execute(url: RegExpMatchArray, ctx: Context, logger: Logger): Promise<void>;
}
