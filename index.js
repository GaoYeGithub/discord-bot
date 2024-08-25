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

const curseWords = ['damn', 'shit', 'fuck', 'ass', 'bastard'];

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

async function saveCurseWord(userId, username, message) {
  const key = `curse_${userId}_${Date.now()}`;
  await db.set(key, { username, message });
  console.log(`Saved curse word: ${key}`, { username, message });
}

async function getCurseWords() {
  const result = await db.list();
  console.log('db.list() returned:', result);

  let keys = [];
  if (result && result.ok && Array.isArray(result.value)) {
    keys = result.value;
  } else {
    console.log('Unexpected format from db.list():', result);
    return [];
  }

  const curseEntries = await Promise.all(
    keys
      .filter(key => key.startsWith('curse_'))
      .map(async key => {
        const result = await db.get(key);
        console.log(`Retrieved value for ${key}:`, result);
        return { key, value: result.value };
      })
  );
  return curseEntries;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (containsCurseWord(message.content)) {
    await saveCurseWord(message.author.id, message.author.username, message.content);
    console.log(`Curse word detected from ${message.author.username}: ${message.content}`);
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

      case 'view':
      try {
        const curseEntries = await getCurseWords();
        if (curseEntries.length === 0) {
          message.reply('No curse words recorded yet, or there was an issue retrieving the data.');
        } else {
          const embed = new EmbedBuilder()
            .setTitle('Recorded Curse Words')
            .setColor('#FF0000');

          curseEntries.forEach((entry, index) => {
            const data = entry.value;
            let username, curseMessage;

            if (typeof data === 'string') {
              username = 'Unknown';
              curseMessage = data;
            } else if (data && typeof data === 'object') {
              username = data.username || 'Unknown';
              curseMessage = data.message || 'No message';
            } else {
              username = 'Unknown';
              curseMessage = 'No message';
            }

            embed.addFields({ 
              name: `Entry ${index + 1}`, 
              value: `User: ${username}\nMessage: ${curseMessage}\nKey: ${entry.key}`
            });
          });

          message.channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error fetching curse words:', error);
        message.reply('Sorry, I encountered an error while fetching the curse word entries. Please check the console for more details.');
      }
      break;

    default:
      message.reply('Unknown command. Try !hello, !meme, or !view');
  }
});

client.login(token);