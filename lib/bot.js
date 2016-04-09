'use strict';

const Botkit = require('botkit');
// const moment = require('moment');
const logger = require('./logger')();

const hideSeek = require('./games/hide-seek');

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

    // Load the games
    this.games.set(hideSeek.config.name, hideSeek);

    this.controller = Botkit.slackbot();
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
    retVal = (/help|play/i.test(message));

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
        this.bot.reply(message, 'This is a helpful message');
      } else if (/^play$/i.test(message.text)) {
        let response = '*Available games*:\n';
        this.games.forEach((instance, name) => {
          response += `- ${name}\n`;
        });

        this.bot.reply(message, response);
      } else if (/^play .*/i.test(message.text)) {
        const matches = message.text.match(/^play (.*)/i);
        if (matches && matches.length > 1) {
          const gameName = matches[1];
          const GameType = this.games.get(gameName);
          if (GameType) {
            const key = GameType.unique.global ? gameName : `${message.channel}-${gameName}`;
            if (!this.activeGames.has(key)) {
              const instance = new GameType.Game(
                this.lookup, {
                  self: this.payload.self,
                  message: (response) => {
                    this.bot.say(response);
                  },
                }, logger);
              this.activeGames.set(key, instance);

              instance.start().then(() => {
                this.activeGames.delete(key);
              }).reject((err) => {
                logger.error(err);
                this.activeGames.delete(key);
              });
            } else {
              this.bot.reply(message, `Another instance of ${gameName} is already running.`);
            }
          } else {
            this.bot.reply(message, `Cannot find ${gameName}.\n` +
              `Try '@${this.payload.self.name} play' for a list of games`);
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
    logger.info(message);
    if (message.event === 'direct_mention' && this.isCommand(message.text)) {
      this.handleCommand(message);
    } else {
      this.activeGames.forEach((instance) => {
        instance.handleMessage(
          message,
          this.lookup.get(message.user),
          this.lookup.get(message.channel)
        ).then((response) => {
          this.bot.reply(message, response);
        }).error((err) => {
          logger.error(err);
        });
      });
    }
  }

  /**
   * Start the bot
   *
   * @return {Bot} returns itself
   */
  start() {
    this.controller.on(
      'direct_mention,mention,ambient,direct_message,reaction_added,reaction_removed',
      (bot, message) => {
        this.handleMessage(message);
      }
    );

    this.controller.on('team_join,user_change,bot_group_join,bot_channel_join', (bot, message) => {
      if (message.user && message.user.id) {
        logger.info(`Saw new user: ${message.user.name}`);
        this.lookup.set(message.user.id, message.user);
      } else if (message.channel && message.channel.id) {
        logger.info(`Saw new channel: ${message.channel.name}`);
        this.lookup.set(message.channel.id, message.channel);
      }
    });

    this.controller.on('rtm_close', () => {
      logger.info('The RTM api just closed');

      if (this.config.slack.autoReconnect) {
        this.connect();
      }
    });

    this.connect();

    return this;
  }

  /**
   * Connect to the RTM
   * @return {Bot} this
   */
  connect() {
    this.bot = this.controller.spawn({
      token: this.config.slack.token,
      no_unreads: true,
      mpim_aware: true,
    }).startRTM((err, bot, payload) => {
      if (err) {
        logger.error('Error starting bot!', err);
      }

      this.payload = payload;
      this.slackOpen(payload);
    });

    return this;
  }
}

module.exports = Bot;
