import { Context } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";

export async function replyWithVideo(ctx: Context, video: string): Promise<Message.VideoMessage> {
    return ctx.replyWithVideo(
        {
          url: video,
        },
        {
          reply_to_message_id: ctx.message?.message_id,
          caption: `${
            ctx.message?.from.username ?? ctx.message?.from.first_name
          } shared a video ${video}`,
        }
    )
}