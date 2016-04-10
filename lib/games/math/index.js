'use strict';

const SIGN_ADD = '+';
const SIGN_SUB = '-';
const SIGN_MUL = 'x';

const SIGNS = [SIGN_ADD, SIGN_SUB, SIGN_MUL];

const STATUS_ROUNDS = 1;
const STATUS_PLAY = 2;

/**
 * @module MathGame
 */
class MathGame {
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
      maxTurns: 10,
      maxNum: 20,
    };

    this.winners = {};

    this.init();
  }

  /**
   * Static method to return help message that explains how to play the game
   * @return {Promise} A promise that resolves with a formatted help string
   */
  static help() {
    const promise = new Promise((resolve) => {
      resolve('Help!');
    });

    return promise;
  }

  /**
   * Start game lifecycle
   *
   * @param {object} info Information about the channel I started in
   * @return {Promise} A promise that will resolve when the game is finished
   */
  start(info) {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;
      this.game.channel = info.channel;

      this.game.turns = this.options.maxTurns || 5;
      this.game.turn = 1;
    });

    this.bot.message({
      channel: info.channel,
      text: `How many rounds would you like to play? (1-${this.game.turns})`,
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
  handleMessage(message, user) {
    const promise = new Promise((resolve) => {
      const num = parseInt(message.text, 10);
      if (this.game.status === STATUS_ROUNDS) {
        if (num < this.options.maxTurns && num > 0) {
          this.game.turns = num;
          this.game.status = STATUS_PLAY;
          this.game.question = this.generateQuestion(this.game.turn);
          resolve(`Question ${this.game.turn}: ${this.game.question.question} = ?`);
        } else {
          resolve(`Number of rounds must be between 1 and ${this.options.maxTurns} (${num})`);
        }
      } else if (this.game.status === STATUS_PLAY && num === this.game.question.solution) {
        // Winner!
        this.game.turn++;
        if (this.game.turn <= this.game.turns) {
          this.game.question = this.generateQuestion(this.game.turn);
          resolve(`Correct ${user.profile.real_name}! The answer is: ${num}\n` +
            `Question ${this.game.turn}: ${this.game.question.question}`);
        } else {
          this.end();
        }
      }
    });

    return promise;
  }

  /**
   * Generate a question.
   *
   * @param {integer} length The length of the question
   * @return {object} the question and answer
   * {
   *  question: string, the visible string of the question
   *  solution: integer, the correct answer (hopefully)
   * }
   */
  generateQuestion(length) {
    const retVal = {
      question: '',
      solution: Math.floor(Math.random() * this.options.maxNum * 2) - this.options.maxNum,
    };
    retVal.question += retVal.solution;

    for (let x = 0; x < length; x++) {
      const sign = SIGNS[Math.floor(Math.random() * SIGNS.length)];
      const nextNum = Math.floor(Math.random() * this.options.maxNum * 2) - this.options.maxNum;
      switch (sign) {
        case SIGN_ADD:
          retVal.question += ` + ${nextNum}`;
          retVal.solution += nextNum;
          break;
        case SIGN_SUB:
          retVal.question += ` - ${nextNum}`;
          retVal.solution -= nextNum;
          break;
        case SIGN_MUL:
          retVal.question += ` x ${nextNum}`;
          retVal.solution *= nextNum;
          break;
        default:
      }
    }

    this.logger.info('Generating Math question:', retVal);

    return retVal;
  }

  /**
   * Initialize game
   * @return {boolean} Returns true
   */
  init() {
    this.game = {
      status: STATUS_ROUNDS,
      end: null,
      error: null,
      turns: null,
      question: null,
    };

    return true;
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end() {
    this.game.end();

    // Blast out message about who won?

    return true;
  }
}

module.exports = {
  config: {
    name: 'Math',
    unique: {
      global: false,
    },
  },
  Game: MathGame,
};
