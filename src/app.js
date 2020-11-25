const discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('logger');
const moment = require('moment');
require('toml-require').install({ toml: require('toml') });
const CONFIG = require(path.join(process.cwd(), 'config/config.toml'));
const BOT = new discord.Client();

const buildEmbedFromDB = () => {
  const buffer = fs.readFileSync('db/db.json');
  const arrOfUsers = JSON.parse(buffer);

  let descriptionContent = '';
  for (const userInDB of arrOfUsers) {
    const future = moment.unix(userInDB.timestamp);
    const now = moment();
    const duration = moment.duration(future.diff(now));
    descriptionContent += `<@${userInDB.id}> - ${duration.days()}d ${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s\n`
  }

  const embed = {
    title: 'React to reset your timer',
    description: descriptionContent
  };

  return embed;
};

const updateDatabase = (user) => {
  const buffer = fs.readFileSync('db/db.json');
  const arrOfUsers = JSON.parse(buffer);

  let userFoundInDB = false;
  const nowPlus3Days = moment().add(3, 'days').format('X');
  for (const userInDB of arrOfUsers) {
    if (userInDB.id === user.id) {
      userInDB.timestamp = nowPlus3Days;
      userFoundInDB = true;
    }
  }

  if (userFoundInDB === false) {
    arrOfUsers.push({ id: user.id, timestamp: nowPlus3Days });
  }

  fs.writeFileSync('db/db.json', JSON.stringify(arrOfUsers));
};

BOT.on('error', err => {
  logger.error(err.message);
});

BOT.on('messageReactionAdd', async (messageReaction, user) => {
  if (user.bot) return;
  
  await messageReaction.users.remove(user);

  updateDatabase(user);

  const embed = buildEmbedFromDB();

  await messageReaction.message.edit('', { embed });
});

BOT.on('ready', async () => {
  await BOT.guilds.cache.get(CONFIG.guildID).channels.cache.get(CONFIG.channelID).bulkDelete(100);

  const embed = buildEmbedFromDB();

  const sentMessage = await BOT.guilds.cache.get(CONFIG.guildID).channels.cache.get(CONFIG.channelID).send('', { embed });

  sentMessage.react('🔄');

  BOT.setInterval(() => {
    const embed = buildEmbedFromDB();

    sentMessage.edit('', { embed });
  }, 5000);
});

BOT.login(CONFIG.discordBOTToken).catch(e => logger.error(e));