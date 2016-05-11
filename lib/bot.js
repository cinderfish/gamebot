'use strict';

const fs = require('fs');
const Botkit = require('botkit');
// const moment = require('moment');
const logger = require('./logger')();

const STORAGE_DEFAULT = 'memory';
const storage = {
  memory: require('./storage/Memory'),
  firebase: require('./storage/Firebase'),
};

/**
 * @module Bot
 */
class Bot {
  /**
   * Constructor.
   *
   * @constructor
   * @param {Config} config The final configuration for the bot
   */
  constructor(config) {
    this.config = config;
    this.payload = {};

    this.lookup = new Map();
    this.games = new Map();
    this.activeGames = new Map();

    // Load Storage
    const storageDriver = storage.hasOwnProperty(config.storage.type.toLowerCase()) ?
      config.storage.type.toLowerCase() : STORAGE_DEFAULT;
    logger.info(`Loading Storage Driver: ${storageDriver} with config:`, config.storage.config);
    this.storage = new storage[storageDriver](config.storage.config);

    // Load the games
    const games = fs.readdirSync(`${__dirname}/games`);
    for (const gameDir of games) {
      try {
        const game = require(`${__dirname}/games/${gameDir}`);
        if (game.config && game.Game) {
          this.games.set(game.config.name.toLowerCase(), game);
          logger.info(`Loaded ${game.config.name} from /games/${gameDir}`);
        } else {
          throw new Error('Unexpected object format');
        }
      } catch (error) {
        logger.error(`Unable to load: ${gameDir}`, error);
      }
    }

    this.controller = Botkit.slackbot({
      logger,
    });
  }

  /**
   * Populates a quick lookup table.
   *
   * @param {object} payload The rtm.start payload
   * @return {Bot} returns itself
   */
  populateLookup(payload) {
    ['users', 'channels', 'groups', 'mpims'].forEach((type) => {
      if (payload[type]) {
        payload[type].forEach((item) => {
          this.lookup.set(item.id, item);
        });
      }
    });

    return this;
  }

  /**
   * Function to be called on slack open
   *
   * @param {object} payload Connection payload
   * @return {Bot} returns itself
   */
  slackOpen(payload) {
    const channels = [];
    const groups = [];
    const mpims = [];

    logger.info(`Welcome to Slack. You are @${payload.self.name} of ${payload.team.name}`);

    if (payload.channels) {
      payload.channels.forEach((channel) => {
        if (channel.is_member) {
          channels.push(`#${channel.name}`);
        }
      });

      logger.info(`You are in: ${channels.join(', ')}`);
    }

    if (payload.groups) {
      payload.groups.forEach((group) => {
        groups.push(`${group.name}`);
      });

      logger.info(`Groups: ${groups.join(', ')}`);
    }

    if (payload.mpims) {
      payload.mpims.forEach((mpim) => {
        mpims.push(`${mpim.name}`);
      });

      logger.info(`Multi-person IMs: ${mpims.join(', ')}`);
    }

    return this;
  }

  /**
   * Parse a message to see if it is a command.
   *
   * @param {string} message The message to parse
   * @return {boolean} True if the message is a command, false otherwise
   */
  isCommand(message) {
    let retVal = false;
    retVal = (/help|play|stats/i.test(message));

    return retVal;
  }

  /**
   * Handle a command
   * @param {object} message The incoming command from Slack
   * @return {null} nada
   */
  handleCommand(message) {
    if (message.text) {
      if (/^help$/i.test(message.text)) {
        this.bot.reply(message,
          'The gamebot will play various games with you.\n' +
          `To play a game, type: @${this.payload.self.name} play <game name>\n` +
          `To list the games you can play, type: @${this.payload.self.name} play` +
          `To list the stats for a game, type: @${this.payload.self.name} stats <game name>`
        );
      } else if (/^help/i.test(message.text)) {
        const strHelp = message.text.match(/^help (.*)/i);
        if (strHelp && strHelp.length > 1) {
          const GameType = this.games.get(strHelp[1].toLowerCase());
          if (GameType) {
            GameType.Game.help(this.payload.self)
              .then((helpText) => {
                this.bot.reply(message, helpText);
              }).catch((err) => {
                this.bot.reply(message, `Error getting help for ${strHelp[1]}: ${err}`);
              });
          } else {
            this.bot.reply(message, `Cannot find ${strHelp[1]}.\n` +
              `Try '@${this.payload.self.name} play' for a list of games`);
          }
        } else {
          this.bot.reply(message, 'I\'m not sure what you want help with. Try just \'help\'');
        }
      } else if (/^(play|stats)$/i.test(message.text)) {
        let response = '*Available games*:\n';
        this.games.forEach((instance) => {
          response += `- ${instance.config.name}\n`;
        });

        this.bot.reply(message, response);
      } else if (/^play .*/i.test(message.text)) {
        const strGames = message.text.match(/^play (.*)/i);
        if (strGames && strGames.length > 1) {
          const gameName = strGames[1];
          const GameType = this.games.get(gameName.toLowerCase());
          if (GameType) {
            const key = GameType.config.unique.global ?
              GameType.config.name : `${message.channel}-${GameType.config.name}`;
            if (!this.activeGames.has(key)) {
              const instance = new GameType.Game(
                this.lookup, {
                  self: this.payload.self,
                  message: (response) => {
                    this.bot.say(response);
                  },
                }, logger);
              this.activeGames.set(key, {
                GameType,
                channel: message.channel,
                instance,
              });

              logger.info(`Starting a game of ${GameType.config.name} in ` +
                `#${this.lookup.get(message.channel).name}`);
              const startTime = Date.now();
              instance.start({
                channel: message.channel,
              })
                .then((play) => {
                  // Store play
                  const newPlay = {
                    stats: play || {},
                    start: startTime,
                    finish: Date.now(),
                    channel: message.channel,
                    originator: message.user,
                  };
                  logger.info(`Ending game of ${GameType.config.name} in ` +
                    `#${this.lookup.get(message.channel).name}`, newPlay);

                  this.storage.addPlay(GameType.config.name, newPlay)
                    .then(() => {
                      // Allow game to calculate new stats object
                      Promise.all([
                        this.storage.getStats(GameType.config.name),
                        this.storage.getHistory(GameType.config.name),
                      ]).then((arrRes) => {
                        const history = Array.isArray(arrRes[0]) ? arrRes[0] : arrRes[1];
                        const stats = Array.isArray(arrRes[0]) ? arrRes[1] : arrRes[0];
                        instance.updateStats(stats, history, newPlay)
                          .then((newStats) => {
                            this.storage.setStats(GameType.config.name, newStats)
                              .then((savedStats) => {
                                logger.info(
                                  `Updated stats for: ${GameType.config.name}`, savedStats
                                );
                                this.activeGames.delete(key);
                              }).catch((err) => {
                                logger.error(
                                  `Error saving stats for: ${GameType.config.name}`, err
                                );
                                this.activeGames.delete(key);
                              });
                          }).catch((err) => {
                            logger.error(
                              `Error updating stats for: ${GameType.config.name}`, err
                            );
                            this.activeGames.delete(key);
                          });
                      }).catch((err) => {
                        logger.error(
                          `Error getting stats/history for: ${GameType.config.name}`, err
                        );
                        this.activeGames.delete(key);
                      });
                    }).catch((err) => {
                      logger.error(`Error saving play for: ${GameType.config.name}`, err);
                      this.activeGames.delete(key);
                    });
                }).catch((err) => {
                  logger.error(err);
                  logger.info(`Ending game of ${GameType.config.name} in ` +
                    `#${this.lookup.get(message.channel).name}`);
                  this.activeGames.delete(key);
                });
            } else {
              const channel = this.lookup.get(message.channel);
              const channelName = channel.name || 'Unknown Channel';
              const location = GameType.config.unique.global ?
                `in ${this.payload.team.name}` : `in #${channelName}`;
              this.bot.reply(message,
                `Another instance of ${GameType.config.name} is already running ${location}`
              );
            }
          } else {
            this.bot.reply(message, `Cannot find ${gameName}.\n` +
              `Try '@${this.payload.self.name} play' for a list of games`);
          }
        }
      } else if (/^stats .*/i.test(message.text)) {
        const strGames = message.text.match(/^stats (.*)/i);
        if (strGames && strGames.length > 1) {
          const gameName = strGames[1];
          const GameType = this.games.get(gameName.toLowerCase());
          if (GameType) {
            this.storage.getStats(GameType.config.name)
              .then((stats) => {
                logger.info(stats);
                this.bot.reply(message, {
                  as_user: true,
                  attachments: [
                    {
                      pretext: `*${GameType.config.name} Stats:*\n`,
                      text: GameType.Game.formatStats(stats, message.channel, this.lookup),
                      mrkdwn_in: ['text', 'pretext'],
                    },
                  ],
                }, (err) => {
                  if (err) {
                    logger.error('Error replying to message', err);
                  }
                });
              }).catch((err) => {
                logger.error(`Error fetching stats for: ${GameType.config.name}`, err);
              });
          } else {
            this.bot.reply(message, `Cannot find ${gameName}.\n` +
              `Try '@${this.payload.self.name} stats' for a list of games`);
          }
        }
      }
    }
  }

  /**
   * Handle an incoming message
   * @param {object} message The incoming message from Slack
   * @returns {null} nada
   */
  handleMessage(message) {
    if (message.event === 'direct_mention' && this.isCommand(message.text)) {
      this.handleCommand(message);
    } else {
      this.activeGames.forEach((game) => {
        // Only send message to interested instances
        if (game.GameType.config.unique.global || game.channel === message.channel) {
          game.instance.handleMessage(
            message,
            this.lookup.get(message.user),
            this.lookup.get(message.channel)
          ).then((response) => {
            if (response && typeof response === 'string' && response.length) {
              this.bot.reply(message, response);
            }
          }).catch((err) => {
            logger.error(err);
          });
        }
      });
    }
  }

  /**
   * Start the bot
   *
   * @return {Bot} returns itself
   */
  start() {
    /* istanbul ignore next */
    this.controller.on(
      'direct_mention,mention,ambient,direct_message,reaction_added,reaction_removed',
      (bot, message) => {
        this.handleMessage(message);
      }
    );

    /* istanbul ignore next */
    this.controller.on('team_join,user_change,group_joined,channel_joined', (bot, message) => {
      if (message.user && message.user.id) {
        logger.info(`Saw new user: ${message.user.name}`);
        this.lookup.set(message.user.id, message.user);
      } else if (message.channel && message.channel.id) {
        logger.info(`Saw new channel: ${message.channel.name}`);
        this.lookup.set(message.channel.id, message.channel);
      }
    });

    /* istanbul ignore next */
    this.controller.on('rtm_close', () => {
      logger.info('The RTM api just closed');

      if (this.config.slack.autoReconnect) {
        this.connect();
      }
    });

    /* istanbul ignore next */
    this.connect();

    /* istanbul ignore next */
    return this;
  }

  /**
   * Connect to the RTM
   * @return {Bot} this
   */
  connect() {
    /* istanbul ignore next */
    this.bot = this.controller.spawn({
      token: this.config.slack.token,
      retry: this.config.slack.autoReconnect ? Infinity : 0,
    }).startRTM((err, bot, payload) => {
      if (err) {
        logger.error('Error starting bot!', err);
      }

      this.payload = payload;
      this.populateLookup(payload);
      this.slackOpen(payload);
    });

    /* istanbul ignore next */
    return this;
  }
}

module.exports = Bot;
