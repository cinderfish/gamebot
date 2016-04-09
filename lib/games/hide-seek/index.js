'use strict';

/**
 * @module HideSeekGame
 */
 class HideSeekGame {
  /**
   * Class constructor
   * @param  {object} config Various Slack information, channels, users, etc
   * @param  {object} me     Information about the game
   * @param  {Logger} logger Instance of logger utility
   */
  constructor(config, me, logger) {
    this.config = config;
    this.me = me;
    this.logger = logger;

    this.name = 'hideseek';
    this.unique = {
      global: true
    };
  }

  /**
   * Help text for game
   * @return {Promise} A promise that resolves with a formatted help string
   */
  help() {
    let promise = new Promise(function(resolve, reject) {
      reject('Not implemented yet');
    });

    return promise;
  }

  /**
   * Start game lifecycle
   * @return {Promise} A promise that will resolve when the game is finished
   */
  start() {
    let promise = new Promise(function(resolve, reject) {
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
    let promise = new Promise(function(resolve, reject) {
      reject('Not implemented yet');
    });

    return promise;
  }
 }
