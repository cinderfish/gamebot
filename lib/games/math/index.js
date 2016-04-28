'use strict';

const SIGN_ADD = '+';
const SIGN_SUB = '-';

const SIGNS = [SIGN_ADD, SIGN_SUB];

const STATUS_ROUNDS = 1;
const STATUS_PLAY = 2;

const config = {
  name: 'Math',
  unique: {
    global: false,
  },
};

/**
 * @module MathGame
 */
class MathGame {
  /**
   * Class constructor
   * @param  {object} map    Map of slack channels and user ids to info
   * @param  {object} bot    Information about the bot
   * @param  {Logger} logger Instance of logger utility
   */
  constructor(map, bot, logger) {
    this.lookup = map;
    this.bot = bot;
    this.logger = logger;

    // Game Options
    this.options = {
      maxTurns: 10,
      maxNum: 20,
    };

    this.winners = new Map();

    this.init();
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise} A promise that resolves with a formatted help string
   */
  static help(bot) {
    const promise = new Promise((resolve) => {
      resolve(
        'A game where the gamebot will ask increasingly harder math questions\n' +
        `To play, type: @${bot.name} play ${config.name}\n` +
        'First it will ask how many rounds you wish to play, respond with ' +
        `@${bot.name} <number>.\nThe bot will then begin asking math questions.\n` +
        'To answer, simply type a number in the channel. The first to answer correctly wins!'
      );
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
        if (num <= this.options.maxTurns && num > 0) {
          this.game.turns = num;
          this.game.status = STATUS_PLAY;
          this.game.question = this.generateQuestion(this.game.turn);
          resolve(`Question ${this.game.turn}: ${this.game.question.question} = ?`);
        } else if (num === +num) {
          // Throw error only on number
          resolve(`Number of rounds must be between 1 and ${this.options.maxTurns} (${num})`);
        }
      } else if (this.game.status === STATUS_PLAY && num === this.game.question.solution) {
        // Winner!
        this.addWinner(user.id, this.game.turn);
        this.game.turn++;
        this.bot.message({
          channel: this.game.channel,
          text: `Correct ${user.profile.real_name}! The answer is: ${num}`,
        });

        if (this.game.turn <= this.game.turns) {
          this.game.question = this.generateQuestion(this.game.turn);
          resolve(`Question ${this.game.turn}: ${this.game.question.question}`);
        } else {
          this.end();
        }
      }
    });

    return promise;
  }

  /**
   * Adds a winner to the winner table
   * @param {string}  userId the user
   * @param {integer} turn   the winning turn to increase the score by
   * @return {null} nada
   */
  addWinner(userId, turn) {
    const score = this.winners.get(userId) || 0;
    this.winners.set(userId, score + turn);
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
        // case SIGN_MUL:
        //   retVal.question += ` x ${nextNum}`;
        //   retVal.solution *= nextNum;
        //   break;
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
    const sortWinners = [];
    for (const winner of this.winners.entries()) {
      sortWinners.push(winner);
    }

    const winners = sortWinners
      .sort((a, b) => b[1] - a[1])
      .map((winUser) => {
        const user = this.lookup.get(winUser[0]);
        const userName = user ? user.profile.real_name : 'Mystery User';
        return `${userName}: ${winUser[1]}`;
      })
      .join('\n');

    this.bot.message({
      channel: this.game.channel,
      text: '> Game Over :clap:\n' +
        `*Players: (score)*\n${winners}`,
    });

    this.game.end();
    return true;
  }
}

module.exports = {
  config,
  Game: MathGame,
};
