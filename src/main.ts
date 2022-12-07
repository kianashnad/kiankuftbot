import * as dotenv from 'dotenv';
// Extracting env variables from the .env file
dotenv.config();

import { Telegraf } from 'telegraf';

// This function will make loading of env variables fail-safe
function getEnv(envName: string): string {
  const returningVariable = process.env[envName];
  // Checking if the variable is not undefined, or empty
  if (returningVariable && returningVariable.length > 0) {

    return returningVariable.replace(/\\n/gm, '\n');
  }
  // If the variable is undefined or empty, print an error and exit the process
  console.error(`error loading env variable ${envName}`);
  process.exit(1);
}

// This interface will be used to structure the trolling records :)
interface AngerRecord {
  uuid: number;
  count: number;
}

// Initializing some variables from envs
console.info('INITIALIZATION:', 'ENV VARIABLES');
const bot = new Telegraf(getEnv('KIANO_KUFT_BOT_TOKEN'));
const groupID: number = parseInt(getEnv('KIANO_KUFT_TG_GROUP_ID'));
const keywords: string[] = getEnv('KIANO_KUFT_KEYWORDS').toLowerCase().split(',');
const angerThreshold: number = parseInt(getEnv('KIANO_KUFT_ANGER_THRESHOLD'));
const resetAngerRecordInMinutes: number = parseInt(getEnv('KIANO_KUFT_RESET_ANGER_RECORD_IN_MINUTES'));
const mentionUsername: string = getEnv('KIANO_KUFT_MENTION_USERNAME');
const replyMessages: string[] = getEnv('KIANO_KUFT_REPLY_MESSAGES').split(',');
const lowAngerMessages: string[] = getEnv('KIANO_KUFT_LOW_ANGER_MESSAGES').split(',');
const highAngerMessages: string[] = getEnv('KIANO_KUFT_HIGH_ANGER_MESSAGES').split(',');

const welcomeMessageEnabledMessage: string = getEnv('KIANO_KUFT_WELCM_MSG_ENABLED_MSG');
const welcomeMessageDisabledMessage: string = getEnv('KIANO_KUFT_WELCM_MSG_DISABLED_MSG');
const adminIDs: string[] = getEnv('KIANO_KUFT_ADMINS').split(',');

let isWelcomeMessageEnabled = true;

// This is where the trolling records will be saved
let userTrollingRecords: AngerRecord[] = [];
// The trolling records will be erased after a duration of time, set in the envs
setInterval(() => (userTrollingRecords = []), 1000 * 60 * resetAngerRecordInMinutes);

// This variable is a part of the getSemiRandomArrayIndex function
let lastReplyArrayIndex = -1;

/*
 This function is not really random,
 it feels random because the index given may be manipulated by the previous operation.
 When it's called, if the current number saved in the state is equal or more than the length of the provided array,
 it will reset the state and return 0, otherwise, it will just return the current number.
 The returning number will be used to select the array index.
 */
function getSemiRandomArrayIndex(arr: string[]): number {
  if (lastReplyArrayIndex >= arr.length - 1) {
    lastReplyArrayIndex = -1;
  }
  lastReplyArrayIndex++;
  return lastReplyArrayIndex;
}

// This function accepts a string and checks if it includes any of the keywords set in the envs
function includesKeywords(targetString: string) {
  const _targetString = targetString.toLowerCase().split(' ');
  for (let i = 0; i < keywords.length; i++) {
    if (_targetString.includes(keywords[i])) {
      return true;
    }
  }

  return false;
}

//This function adds a trolling record for a user. If the user already has a record, it will increase the count.
function addUserTrollingRecord(uuid: number) {
  const angerRecordIndex = userTrollingRecords.findIndex(el => el.uuid === uuid);

  if (angerRecordIndex !== -1) {
    userTrollingRecords[angerRecordIndex].count++;
  } else {
    userTrollingRecords.push({
      uuid: uuid,
      count: 1,
    });
  }
}

// This function checks if the user is marked as a troll.
function isMarkedAsTroll(uuid: number) {
  const angerRecordIndex = userTrollingRecords.findIndex(el => el.uuid === uuid);
  // If the tolling count has past a certain threshold, then the user is marked as a troll
  return angerRecordIndex !== -1 && userTrollingRecords[angerRecordIndex].count >= angerThreshold;
}

//  This function checks if a User UUID is for an admin
function isAdmin(uuid: number) {
  return adminIDs.includes(uuid.toString());
}

// When a telegram user sends a text in a group that the bot is, or the bots' private chat, this block executes.
bot.on('text', async ctx => {
  // Checking if the message is in the group determined in envs
  if (ctx.message.chat.id === groupID) {
    // Sender user uuid
    const uuid = ctx.message.from.id;

    // If the sender is an admin, and is sending a "togglewlc" command
    if (isAdmin(uuid) && ctx.message.text.toLowerCase() === '!togglewlc') {
      // Toggle the welcomeMessage state
      isWelcomeMessageEnabled = !isWelcomeMessageEnabled;

      // Send a success message
      await ctx.reply(isWelcomeMessageEnabled ? welcomeMessageEnabledMessage : welcomeMessageDisabledMessage, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    // if the text includes the keywords
    if (includesKeywords(ctx.message.text)) {
      // Checking if it's only one word (if yes, then it's considered trolling)
      if (ctx.message.text.split(' ').length === 1) {
        // Adding a trolling record for the sender user
        addUserTrollingRecord(uuid);
        // Checking if the user is marked as a troll or not.
        const selectedAngryMessages = isMarkedAsTroll(uuid) ? highAngerMessages : lowAngerMessages;
        //Sending a reply to the user
        await ctx.reply(`${selectedAngryMessages[getSemiRandomArrayIndex(selectedAngryMessages)]}`, {
          reply_to_message_id: ctx.message.message_id,
        });
      } else {
        //  When the user is not considered trolling the bot, it will receive a normal message.
        await ctx.reply(`${replyMessages[getSemiRandomArrayIndex(replyMessages)]}\n${mentionUsername}`, {
          reply_to_message_id: ctx.message.message_id,
        });
      }
    }
  }
});

// Yes! The bot also welcomes the newcomers.
bot.on('new_chat_members', async ctx => {
  if (isWelcomeMessageEnabled && ctx.message.chat.id === groupID && ctx.message.new_chat_members) {
    const messageText = getEnv('KIANO_KUFT_NEW_MEMBER_WELCOME_MESSAGE');
    await ctx.reply(messageText, { reply_to_message_id: ctx.message.message_id });
  }
});

bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
