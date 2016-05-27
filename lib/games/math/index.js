'use strict';

const SIGN_ADD = '+';
const SIGN_SUB = '-';

const SIGNS = [SIGN_ADD, SIGN_SUB];

const STATUS_ROUNDS = 1;
const STATUS_PLAY = 2;

const config = {
  name: 'Math',
  unique: {
    global: false
  }
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
  constructor (map, bot, logger) {
    this.lookup = map;
    this.bot = bot;
    this.logger = logger;

    // Game Options
    this.options = {
      maxTurns: 10,
      maxNum: 20
    };

    this.winners = new Map();

    this.game = {
      status: STATUS_ROUNDS,
      end: null,
      error: null,
      turns: null,
      question: null
    };
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise} A promise that resolves with a formatted help string
   */
  static help (bot) {
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
  start (info) {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;
      this.game.channel = info.channel;

      this.game.turns = this.options.maxTurns || 5;
      this.game.turn = 1;
    });

    this.bot.message({
      channel: info.channel,
      text: `How many rounds would you like to play? (1-${this.game.turns})`
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
  handleMessage (message, user) {
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
          text: `Correct ${user.profile.real_name}! The answer is: ${num}`
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
  addWinner (userId, turn) {
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
  generateQuestion (length) {
    const retVal = {
      question: '',
      solution: Math.floor(Math.random() * this.options.maxNum * 2) - this.options.maxNum
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
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end () {
    const sortWinners = [];
    for (const winner of this.winners.entries()) {
      sortWinners.push(winner);
    }

    const winner = {
      winner: null,
      score: null
    };
    const winners = sortWinners
      .sort((a, b) => b[1] - a[1])
      .map((winUser) => {
        const user = this.lookup.get(winUser[0]);
        const userName = user ? user.profile.real_name : 'Mystery User';
        if (!winner.winner && user) {
          winner.winner = user.id;
          winner.score = winUser[1];
        }
        return `${userName}: ${winUser[1]}`;
      })
      .join('\n');

    this.bot.message({
      channel: this.game.channel,
      text: '> Game Over :clap:\n' +
        `*Players: (score)*\n${winners}`
    });

    this.game.end(winner);
    return true;
  }

  /**
   * Updates the stats for the Game
   * Stats Object:
   * {
   *  global: {
   *    plays: integer, number of times the game has been played
   *    records: {
   *      highest: {
   *        score: integer, the highest winning score
   *        user: string, the user id who won with this word
   *      },
   *      lowest: {
   *        score: integer, the lowest winning score
   *        user: string, the user id who won with this word
   *      },
   *    },
   *    wins: [
   *      {
   *        user: string, user id
   *        wins: integer, number of wins
   *      },
   *    ]
   *  },
   *  channels: {
   *    C0000000: {
   *     // same format as global
   *    }, ...
   *  }
   * }
   *
   * @param {object}   stats    The previous stats object
   * @param {object[]} history  The game's stored history
   * @param {object}   lastPlay The last play through
   * @return {Promise} A promise that resolves with the new stats object to be stored
   */
  updateStats (stats, history, lastPlay) {
    return new Promise((resolve) => {
      const newStats = stats;
      newStats.global = this.updateChannelStats(newStats.global || {}, history, lastPlay);

      if (!newStats.channels) {
        newStats.channels = {};
      }

      newStats.channels[lastPlay.channel] =
        this.updateChannelStats(newStats.channels[lastPlay.channel] || {}, history, lastPlay);

      resolve(newStats);
    });
  }

  /**
   * Updates the stats for the Game
   * Stats Object:
   * {
   *  plays: integer, number of times the game has been played
   *  records: {
   *    higest: {
   *      score: integer, the higest winning score
   *      user: string, the user id who won with this game
   *    },
   *    lowest: {
   *      score: integer, the lowest winning score
   *      user: string, the user id who won with this game
   *    },
   *  },
   *  wins: [
   *    {
   *      user: string, user id
   *      wins: integer, number of wins
   *    },
   *  ]
   * }
   *
   * @param {object}   stats    The previous stats object
   * @param {object[]} history  The game's stored history
   * @param {object}   lastPlay The last play through
   * @return {object} The updated stats object
   */
  updateChannelStats (stats, history, lastPlay) {
    const baseStats = {
      plays: 0,
      records: {
        highest: {
          score: 0,
          user: ''
        },
        lowest: {
          score: 0,
          user: ''
        }
      },
      wins: []
    };

    const newStats = Object.keys(stats).length ? stats : baseStats;

    // Add new play
    newStats.plays++;

    // Check records
    if (Object.keys(lastPlay.stats).length) {
      if (
        !newStats.records.highest.score ||
        newStats.records.highest.score < lastPlay.stats.score
      ) {
        newStats.records.highest = {
          score: lastPlay.stats.score,
          user: lastPlay.stats.winner
        };
      }

      if (
        !newStats.records.lowest.score ||
        newStats.records.lowest.score > lastPlay.stats.score
      ) {
        newStats.records.lowest = {
          score: lastPlay.stats.score,
          user: lastPlay.stats.winner
        };
      }

      let foundUser = false;
      this.logger.info(newStats.wins);
      for (let x = 0; x < newStats.wins.length; x++) {
        this.logger.info(newStats.wins[x].user, lastPlay.stats.winner);
        if (newStats.wins[x].user === lastPlay.stats.winner) {
          newStats.wins[x].wins++;
          foundUser = true;
          break;
        }
      }

      if (!foundUser) {
        newStats.wins.push({
          user: lastPlay.stats.winner,
          wins: 1
        });
      }

      newStats.wins.sort((a, b) => (b.wins - a.wins)); // reverse sort
    }

    return newStats;
  }

  /**
   * Format the stats into a message
   *
   * @param {object} stats   the stats to format
   * @param {string} channel the stats to format
   * @param {Map}    lookup  A lookup map if needed
   * @return {string} the formated message
   */
  static formatStats (stats, channel, map) {
    let retVal = '';

    if (stats.channels && stats.channels[channel]) {
      const chanStats = stats.channels[channel];
      const highestUser = map.get(chanStats.records.highest.user) || null;
      const lowestUser = map.get(chanStats.records.lowest.user) || null;

      retVal += `*<#${channel}> Stats:*\n` +
        `Plays: *${chanStats.plays}*\n` +
        `Highest Score: *${chanStats.records.highest.score}* ` +
        `(${highestUser ? highestUser.real_name : 'Unknown User'})\n` +
        `Lowest Score: *${chanStats.records.lowest.score}* ` +
        `(${lowestUser ? lowestUser.real_name : 'Unknown User'})\n\n` +
        '*Top 5:*\n--------------------------------------------------\n';

      retVal += chanStats.wins.slice(0, 5).reduce((prev, current) => {
        const user = map.get(current.user) || null;
        return `${prev}\n${user ? user.real_name : 'Unknown user'}: ${current.wins}`;
      }, '');
    }

    if (stats.global) {
      const highestUser = map.get(stats.global.records.highest.user) || null;
      const lowestUser = map.get(stats.global.records.lowest.user) || null;

      retVal += '\n\n*Global Stats:*\n' +
        `Plays: *${stats.global.plays}*\n` +
        `Highest Score: *${stats.global.records.highest.score}* ` +
        `(${highestUser ? highestUser.real_name : 'Unknown User'})\n` +
        `Lowest Score: *${stats.global.records.lowest.score}* ` +
        `(${lowestUser ? lowestUser.real_name : 'Unknown User'})\n\n` +
        '*Top 5:*\n--------------------------------------------------\n';

      retVal += stats.global.wins.slice(0, 5).reduce((prev, current) => {
        const user = map.get(current.user) || null;
        return `${prev}\n${user ? user.real_name : 'Unknown user'}: ${current.wins}`;
      }, '');
    }

    if (retVal.length === 0) {
      retVal = `There are no stats for ${config.name}! Play the game to create some!`;
    }

    return retVal;
  }
}

module.exports = {
  config,
  Game: MathGame
};
