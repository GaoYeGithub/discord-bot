const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const Database = require("@replit/database");
const token = process.env['token']
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const db = new Database();
const prefix = '!';

const curseWords = ['damn', 'shit', 'fuck', 'ass', 'bitch'];

function containsCurseWord(message) {
  return curseWords.some(word => message.toLowerCase().includes(word));
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

async function getRandomMeme() {
  let meme;
  do {
    const response = await fetch('https://meme-api.com/gimme');
    const data = await response.json();
    meme = {
      title: data.title,
      url: data.url,
      subreddit: data.subreddit_name_prefixed,
      ups: data.ups
    };
  } while (meme.ups < 500);
  return meme;
}

async function saveCurseWord(userId, message) {
  const key = `curse_${userId}_${Date.now()}`;
  await db.set(key, message);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (containsCurseWord(message.content)) {
    await saveCurseWord(message.author.id, message.content);
    message.reply("Please watch your language!");
    return;
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch(command) {
    case 'hello':
      message.reply('World!');
      break;

    case 'meme':
      try {
        const meme = await getRandomMeme();

        const embed = new EmbedBuilder()
          .setTitle(meme.title)
          .setImage(meme.url)
          .setColor('#0099ff')
          .setFooter({ text: `From: ${meme.subreddit} | 👍 ${meme.ups}` });

        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Error fetching meme:', error);
        message.reply('Sorry, I couldn\'t fetch a meme at the moment. Try again later!');
      }
      break;

    default:
      message.reply('Unknown command. Try !hello or !meme');
  }
});

client.login(token);