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
    const respawnTimestamp = moment.unix(userInDB.timestamp);
    const now = moment();
    const duration = moment.duration(respawnTimestamp.diff(now));
    if (duration.asSeconds() < 0) descriptionContent += `<@${userInDB.id}> - respawned\n`;
    else descriptionContent += `<@${userInDB.id}> - ${duration.days()}d ${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s\n`;
  }

  const embed = {
    title: '▶️: start countdown | ✔️: set as respawned',
    description: descriptionContent,
    color: 65535
  };

  return embed;
};

const updateDatabase = (user, setToZero) => {
  const buffer = fs.readFileSync('db/db.json');
  const arrOfUsers = JSON.parse(buffer);

  let userFoundInDB = false;
  const nowPlus3Days = moment().add(3, 'days').format('X');
  for (const userInDB of arrOfUsers) {
    if (userInDB.id === user.id) {
      if (setToZero) userInDB.timestamp = "0";
      else userInDB.timestamp = nowPlus3Days;
      userFoundInDB = true;
    }
  }

  if (userFoundInDB === false) {
    if (setToZero) arrOfUsers.push({ id: user.id, timestamp: "0" });
    else arrOfUsers.push({ id: user.id, timestamp: nowPlus3Days });
  }

  fs.writeFileSync('db/db.json', JSON.stringify(arrOfUsers));
};

// const removeUserFromMessage = () => {
// 
// };

BOT.on('error', err => {
  logger.error(err.message);
});

BOT.on('messageReactionAdd', async (messageReaction, user) => {
  if (user.bot) return;
  
  await messageReaction.users.remove(user);

  if (messageReaction.emoji.name === '▶️') {
    updateDatabase(user, false);
  }
  else if (messageReaction.emoji.name === '✔️') {
    updateDatabase(user, true);
  }
  // else if (messageReaction.emoji.name === '❌') {
  //   removeUserFromMessage();
  // }

  const embed = buildEmbedFromDB();

  await messageReaction.message.edit('', { embed });
});

BOT.on('ready', async () => {
  await BOT.guilds.cache.get(CONFIG.guildID).channels.cache.get(CONFIG.channelID).bulkDelete(100);

  const embed = buildEmbedFromDB();

  const sentMessage = await BOT.guilds.cache.get(CONFIG.guildID).channels.cache.get(CONFIG.channelID).send('', { embed });

  await sentMessage.react('▶️');
  await sentMessage.react('✔️');
  // await sentMessage.react('❌');

  BOT.setInterval(() => {
    const embed = buildEmbedFromDB();

    sentMessage.edit('', { embed });
  }, 5000);
});

BOT.login(CONFIG.discordBOTToken).catch(e => logger.error(e));