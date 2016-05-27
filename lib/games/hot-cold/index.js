'use strict';

const config = {
  name: 'Hot or Cold',
  unique: {
    global: false
  }
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
  constructor (map, bot, logger) {
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
  static help (bot) {
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
  start (info) {
    return new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.answer = Math.floor(Math.random() * 100);
      this.game.guesses = 0;

      this.logger.info(`Hot or Cold Answer: ${this.game.answer}`);

      this.bot.message({
        channel: info.channel,
        text: `A game of ${config.name} has been started, ` +
          'try to guess the number I\'m thinking (1-100)'
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
  handleMessage (message, user) {
    return new Promise((resolve) => {
      const num = parseInt(message.text, 10);
      if (num === this.game.answer) {
        this.game.guesses++;
        resolve(`Correct ${user.profile.real_name}! The answer is: *${num}*!\n` +
          `It took you all ${this.game.guesses} guesses to find it!`
        );
        this.end({
          winner: user.id,
          guesses: this.game.guesses
        });
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
   * @param {object} game A result with a winner and guesses member
   * @return {boolean} Returns true on success
   */
  end (game) {
    // Resolve the promise which ends the game
    this.game.end(game);

    return true;
  }

  /**
   * Updates the stats for the Game
   * Stats Object:
   * {
   *  global: {
   *    plays: integer, number of times the game has been played
   *    records: {
   *      longest: {
   *        guesses: integer, number of guesses to win
   *      },
   *      shortest: {
   *        guesses: integer, number of guesses to win
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
   *    longest: {
   *      guesses: integer, number of guesses to win
   *      user: string, the user id who won with this game
   *    },
   *    shortest: {
   *      guesses: integer, number of guesses to win
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
        longest: {
          guesses: 0,
          user: ''
        },
        shortest: {
          guesses: 0,
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
        !newStats.records.longest.guesses ||
        newStats.records.longest.guesses < lastPlay.stats.guesses
      ) {
        newStats.records.longest = {
          guesses: lastPlay.stats.guesses,
          user: lastPlay.stats.winner
        };
      }

      if (
        !newStats.records.shortest.guesses ||
        newStats.records.shortest.guesses > lastPlay.stats.guesses
      ) {
        newStats.records.shortest = {
          guesses: lastPlay.stats.guesses,
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
      const longestUser = map.get(chanStats.records.longest.user) || null;
      const shortestUser = map.get(chanStats.records.shortest.user) || null;

      retVal += `*<#${channel}> Stats:*\n` +
        `Plays: *${chanStats.plays}*\n` +
        `Most Guesses: *${chanStats.records.longest.guesses}* ` +
        `(${longestUser ? longestUser.real_name : 'Unknown User'})\n` +
        `Least Guesses: *${chanStats.records.shortest.guesses}* ` +
        `(${shortestUser ? shortestUser.real_name : 'Unknown User'})\n\n` +
        '*Top 5:*\n--------------------------------------------------\n';

      retVal += chanStats.wins.slice(0, 5).reduce((prev, current) => {
        const user = map.get(current.user) || null;
        return `${prev}\n${user ? user.real_name : 'Unknown user'}: ${current.wins}`;
      }, '');
    }

    if (stats.global) {
      const longestUser = map.get(stats.global.records.longest.user) || null;
      const shortestUser = map.get(stats.global.records.shortest.user) || null;

      retVal += '\n\n*Global Stats:*\n' +
        `Plays: *${stats.global.plays}*\n` +
        `Most Guesses: *${stats.global.records.longest.guesses}* ` +
        `(${longestUser ? longestUser.real_name : 'Unknown User'})\n` +
        `Least Guesses: *${stats.global.records.shortest.guesses}* ` +
        `(${shortestUser ? shortestUser.real_name : 'Unknown User'})\n\n` +
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
  Game: HotColdGame
};
