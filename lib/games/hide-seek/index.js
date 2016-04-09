'use strict';

/**
 * @module HideSeekGame
 */
class HideSeekGame {
  /**
   * Class constructor
   * @param  {object} map    Map of slack channels and user ids to info
   * @param  {object} bot    Information about the bot
   * @param  {Logger} logger Instance of logger utility
   */
  constructor(map, bot, logger) {
    this.map = map;
    this.bot = bot;
    this.logger = logger;

    // Game Options
    this.options = {
      maxTurns: 5,
    };

    // Need a default user in case a new user joined slack after the game started
    this.defaultUser = {
      id: null,
      name: 'Unknown User',
    };

    this.defaultChannel = {
      id: null,
      name: 'Unknown Channel',
    };

    this.init();

    // Loop through the map
    this.map.forEach((item) => {
      if (item.is_channel && item.is_member && !item.is_archived) {
        this.game.inChannels.push(item);
        this.game.availableChannels.push(item);
      }
    });
  }

  /**
   * Static method to return help message that explains how to play the game
   * @return {Promise} A promise that resolves with a formatted help string
   */
  static help() {
    const promise = new Promise((resolve, reject) => {
      reject('Not implemented yet');
    });

    return promise;
  }

  /**
   * Start game lifecycle
   * @return {Promise} A promise that will resolve when the game is finished
   */
  start() {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.id = this.generateId();
      this.game.turnsLeft = this.options.maxTurns || 5;

      if (this.game.turnsLeft > this.game.availableChannels.length) {
        this.game.turnsLeft = this.game.availableChannels.length;
      }

      if (!this.hide()) {
        this.game.error('Could not hide');
      }

      this.game.isRunning = true;

      // Blast message to all "in" channels that the bot is now hiding
      this.game.inChannels.forEach((ch) => {
        this.bot.message({
          channel: ch.id,
          text: 'A game of Hide & Seek has been started, be the first to find me :eyes:',
        });
      });
    });

    return promise;
  }

  /**
   * Handle incoming message
   * @param  {object} message Message object from Slack RTM api
   * @param  {object} user    User information
   * @param  {object} channel Channel information
   * @return {Promise}        A promise that resolves with an appropriate response
   */
  handleMessage(message) {
    const promise = new Promise((resolve, reject) => {
      if (!this.game.isRunning) {
        // Game isn't running, don't do anything
        resolve(true);
        return;
      }

      if (!this.game.hidingIn) {
        reject('Something went wrong, the game is running but bot is not hiding');
        return;
      }

      // Check the message type and do something
      if (message.type && message.type === 'message') {
        const user = this.map.get(message.user) || this.defaultUser;
        const channel = this.map.get(message.channel) || this.defaultChannel;

        switch (message.event) {
          case 'direct_mention':
            this.logger.info(`User @${user.name} searched in #${channel.name}`);

            // Add user to the seeker list
            this.game.seekers.push(user);

            // Check if the channel is the channel the bot is hiding in
            if (message.channel === this.game.hidingIn.id) {
              let response = `${user.real_name} found me in <#${channel.name}>`;

              // Add the user to the finders list
              this.game.finders.push(user);

              // Check # of turns left, if more turns left hide, else end game
              if (this.game.turnsLeft) {
                this.hide();
                response += ' I found a new hiding spot, come find me.';
              } else {
                this.end();
              }

              this.game.inChannels.forEach((ch) => {
                this.bot.message({
                  channel: ch.id,
                  text: response,
                });
              });
            } else {
              // Send message to the user in this channel that not in channel
              this.bot.message({
                channel: message.channel,
                text: `:ghost: Sorry ${user.real_name}, I'm not in this channel :ghost:`,
              });
            }
            break;
          default:
            // Unexpected event type, don't do anything
            resolve(true);
            return;
        }
      }
    });

    return promise;
  }

  /**
   * Initialize game
   * @return {boolean} Returns true
   */
  init() {
    this.game = {
      id: null,
      isRunning: false,
      end: null,
      error: null,
      turnsLeft: null,
      inChannels: [],
      availableChannels: [],
      hidingIn: null,
      seekers: [],
      finders: [],
    };

    return true;
  }

  /**
   * Generate random game ID
   * @return {Number} Random game number between 1000 - 9999
   */
  generateId() {
    return Math.floor(Math.random() * 9999) + 1000;
  }

  /**
   * Method used to hide the bot in a random channel
   * @return {boolean} True|False depending on success of hiding
   */
  hide() {
    if (!this.game.availableChannels
      || !this.game.availableChannels.length
      || !this.game.turnsLeft
    ) {
      return false;
    }

    // Randomly pick a channel in this.game.availableChannels to hide in
    const idx = Math.floor(Math.random() * this.game.availableChannels.length);

    // Set the channel that the bot is hiding in
    this.game.hidingIn = this.game.availableChannels[idx];

    // Remove channel from list of channels so it
    // doesn't hide in the same channel twice
    this.game.availableChannels.splice(idx, 1);

    // Decrement # of turns left
    this.game.turnsLeft--;

    this.logger.info(
      `Bot is hiding in ${this.game.hidingIn.name}, ` +
      `${this.game.turnsLeft} turn(s) left`
    );

    // Return true for now
    return true;
  }

  /**
   * Method to check if bot is currently in the provided channel
   * @param  {object} channelId Channel ID
   * @return {boolean}          Returns true if bot is in provided channel
   */
  inChannel(channelId) {
    let found = false;

    this.game.inChannels.forEach((channel) => {
      if (channel.id === channelId) {
        found = true;
      }
    });

    return found;
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end() {
    // Blast message to all "in" channels that the bot was
    // found and the game is over
    this.game.inChannels.forEach((ch) => {
      this.bot.message({
        channel: ch.id,
        text: ':ghost: Game Over! ' +
          `Finders: ${this.game.finders.map((a) => a.real_name).join(', ')}` +
          ':clap: :cake:',
      });
    });

    this.init();

    return true;
  }
}

module.exports = {
  config: {
    name: 'Hide and Seek',
    unique: {
      global: true,
    },
  },
  Game: HideSeekGame,
};
