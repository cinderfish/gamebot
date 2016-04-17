'use strict';

const config = {
  name: 'Hot or Cold',
  unique: {
    global: false,
  },
};

/**
 * @module HotColdGame
 */
class HotColdGame {
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

    this.game = {};
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise}   A promise that resolves with a formatted help string
   */
  static help(bot) {
    const promise = new Promise((resolve) => {
      resolve(
        'A game where the gamebot will randomly select a number for players to guess\n' +
        `To play, type: @${bot.name} play ${config.name}\n` +
        'Once started, players guess a number and the bot will give hints on how close ' +
        'the guess is to the actual number'
      );
    });

    return promise;
  }

  /**
   * Start game lifecycle
   * @param {object} info Information about the channel I started in
   * @return {Promise}       A promise that will resolve when the game is finished
   */
  start(info) {
    return new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.answer = Math.floor(Math.random() * 100);
      this.game.guesses = 0;

      this.logger.info(`Hot or Cold Answer: ${this.game.answer}`);

      this.bot.message({
        channel: info.channel,
        text: `A game of ${config.name} has been started, ` +
          'try to guess the number I\'m thinking (1-100)',
      });
    });
  }

  /**
   * Handle incoming message
   * @param  {object} message Message object from Slack RTM api
   * @param  {object} user    User information
   * @param  {object} channel Channel information
   * @return {Promise}        A promise that resolves with an appropriate response
   */
  handleMessage(message, user) {
    return new Promise((resolve) => {
      const num = parseInt(message.text, 10);
      if (num === this.game.answer) {
        this.game.guesses++;
        resolve(`Correct ${user.profile.real_name}! The answer is: *${num}*!\n` +
          `It took you all ${this.game.guesses} guesses to find it!`
        );
        this.end();
      } else if (num === +num) {
        this.game.guesses++;
        // give a hint
        const diff = Math.abs(this.game.answer - num);
        let response = 'Freezing Cold!';
        if (diff < 5) {
          response = 'Red Hot!';
        } else if (diff < 10) {
          response = 'Hot!';
        } else if (diff < 20) {
          response = 'Warm!';
        } else if (diff < 30) {
          response = 'Cold!';
        }

        resolve(`${num} is ${response}`);
      }
    });
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end() {
    // Resolve the promise which ends the game
    this.game.end();

    return true;
  }
}

module.exports = {
  config,
  Game: HotColdGame,
};
