import * as dotenv from 'dotenv'
dotenv.config()
import {Telegraf} from 'telegraf';
import {parse} from "dotenv";

const bot = new Telegraf(process.env.KIANO_KUFT_BOT_TOKEN);
console.log(`Bot Token => ${process.env.KIANO_KUFT_BOT_TOKEN}`)

let lastReplyArrayIndex = -1

function getSemiRandomArrayIndex(arr) {
  if (lastReplyArrayIndex >= arr.length - 1) {
    lastReplyArrayIndex = -1
  }
  lastReplyArrayIndex++
  return lastReplyArrayIndex
}

const replyMessages = [
  "عزیزم من الان کیان رو منشن میکنم بیاد ببینه چیکارش داری",
  "کیان فعلا دستش بنده، ولی چون تویی میاد میبینه.",

  `با کیان کارداری؟
    کیان بدو بیا کارت دارن.`,

  `کیان رفته ماست بخره بیاد. الان منشنش میکنم خبردار شه باهاش کار داری.`

]

const kermnarizMessages = [

  `اذیت نکن دیگه`,
  `دوست عزیز لطفا کرم نریزید. با تشکر.`,
  `فکر کردی گول میخورم؟ هه.`,
  `بیه 👍`
]

const kermuSpecialMessages = [
  'درد😡',
  '😡کوفت',
  'زهر😡',
  '😡مرض',
  'بسه دیگه😡',
  '😡',
]
const groupID = parseInt(process.env.KIANO_KUFT_TG_GROUP_ID)
const keywords = process.env.KIANO_KUFT_KEYWORDS.toLowerCase().split(",")

function includesKeywords(targetString) {
  const _targetString = targetString.toLowerCase().split(" ")
  for (let i = 0; i < keywords.length; i++) {
    if (_targetString.includes(keywords[i])) {
      return true
    }
  }
}

let userKermCount = []
const kermThreshold = process.env.KIANO_KUFT_KERM_THRESHOLD

function addUserKerm(uuid) {
  const kermuIndex = userKermCount.findIndex(el => el["uuid"] === uuid)

  kermuIndex !== -1 ?
    userKermCount[kermuIndex]["count"]++
    : userKermCount.push({
      "uuid": uuid,
      "count": 1
    })
}

function isMarkedAsKermu(uuid) {
  const kermuIndex = userKermCount.findIndex(el => el["uuid"] === uuid)
  return kermuIndex !== -1 && userKermCount[kermuIndex]["count"] >= kermThreshold
}

function resetAllKerms() {
  userKermCount = []
}

setInterval(() => resetAllKerms(), 1000 * 60 * parse(process.env.KIANO_KUFT_RESET_KERMU_LIST_IN_MINUTES))

bot.on('text', async (ctx) => {


    if (ctx.message.chat.id === groupID && includesKeywords(ctx.message.text)) {
      if (ctx.message.text.split(" ").length === 1) {
        const uuid = ctx.message.from.id
        addUserKerm(uuid)
        const replyMessages = isMarkedAsKermu(uuid) ? kermuSpecialMessages : kermnarizMessages
        await ctx.reply(`${replyMessages[getSemiRandomArrayIndex(replyMessages)]}`,
          {reply_to_message_id: ctx.message.message_id});
      } else if (ctx.message.text.split(" ").includes("کیان") && ctx.message.text.split(" ").includes("بغ")) {
        await ctx.reply(`نکن مسافریان. اذیتم نکن دردم میاد😢`,
          {reply_to_message_id: ctx.message.message_id});
      } else {
        await ctx.reply(`${replyMessages[getSemiRandomArrayIndex(replyMessages)]}\n${process.env.KIANO_KUFT_MENTION_USERNAME}`,
          {reply_to_message_id: ctx.message.message_id});
      }
    }

});

bot.on('new_chat_members', async (ctx) => {
  if (ctx.message.chat.id === groupID && ctx.message.new_chat_members) {
    const messageText = `
        سلام!

        من از طرف احسان و بچه ها بهت خوش آمد میگم.
        خودتو معرفی میکنی؟

        من یه رباتم که وظیفه دارم هرکی گفت کیان، کیان رو صدا بزنم بیاد ببینه چیشده. اینقدر بیکارم والا بخدا.
        `
    await ctx.reply(messageText, {reply_to_message_id: ctx.message.message_id})
  }
})

await bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
