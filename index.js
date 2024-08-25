require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const token = process.env.DISCORD_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const supabase = createClient(supabaseUrl, supabaseKey);
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
  const { data, error } = await supabase
    .from('curse_words')
    .insert([{ userId, username, message }]);

  if (error) {
    console.error('Error saving curse word:', error);
  } else {
    console.log('Saved curse word:', data);
  }
}

async function getCurseWords() {
  const { data, error } = await supabase
    .from('curse_words')
    .select('*');

  if (error) {
    console.error('Error fetching curse words:', error);
    return [];
  } else {
    return data;
  }
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
            embed.addFields({ 
              name: `Entry ${index + 1}`, 
              value: `User: ${entry.username}\nMessage: ${entry.message}`
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
