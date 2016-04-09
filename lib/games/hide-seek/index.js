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

    this.init();
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
      reject('Not implemented yet');

      this.game.end = resolve;
      this.game.error = reject;

      this.game.id = this.generateId();
      this.game.turnsLeft = this.options.maxTurns || 5;

      if (!this.hide()) {
        this.game.error('Could not hide');
      }

      this.game.isRunning = true;

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
  handleMessage() {
    const promise = new Promise((resolve, reject) => {
      reject('Not implemented yet');

      // Check the message type and do something

      // If message type is reaction_added
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
      channels: [],
      hidingIn: null,
      participants: [],
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

  /**
   * Ends the game
   * @return {[type]} [description]
   */
  end() {
    this.init();

    // Blast out message about who won?

    return true;
  }
}

module.exports = {
  config: {
    name: 'Hide & Seek',
    unique: {
      global: true,
    },
  },
  Game: HideSeekGame,
};
