'use strict';

/**
 * @module HideSeekGame
 */
class HideSeekGame {
  /**
   * Class constructor
   * @param  {object} config Various Slack information, channels, users, etc
   * @param  {object} bot    Information about the bot
   * @param  {Logger} logger Instance of logger utility
   */
  constructor(config, bot, logger) {
    this.config = config;
    this.bot = bot;
    this.logger = logger;

    // Game Options
    this.options = {
      maxTurns: 5,
    };

    // Game object
    this.game = {
      isRunning: false,
      end: null,
      error: null,
      turnsLeft: null,
      channels: [],
      hidingIn: null,
      participants: [],
    };
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

      this.game.turnsLeft = this.options.maxTurns || 5;
      this.game.isRunning = true;

      if (!this.hide()) {
        this.game.error('Could not hide');
      }

      // Update channel list to all channels bot is currently in
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
  handleMessage(message, user, channel) {
    const promise = new Promise((resolve, reject) => {
      reject('Not implemented yet');

      // Check the message type and do something
    });

    return promise;
  }

  /**
   * Method used to hide the bot in a random channel
   * @return {boolean} True|False depending on success of hiding
   */
  hide() {
    // Randomly pick a channel in this.game.channels to hide in

    // Return true for now
    return true;
  }

  /**
   * Method to check if bot is currently hiding in the provided channel
   * @param  {object} channel Channel details
   * @return {boolean}        Returns true if bot is hiding in provided channel
   */
  inChannel() {

  }
}

exports.module = {
  config: {
    name: 'Hide & Seek',
    unique: {
      global: true,
    },
  },
  game: HideSeekGame,
};
