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

    this.name = 'Hide & Seek';

    this.unique = {
      global: true,
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
      reject('Not implemented yet');
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
    });

    return promise;
  }
}

exports.module = HideSeekGame;
