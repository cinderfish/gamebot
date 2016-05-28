'use strict';

const request = require('request');
const async = require('async');
const parseString = require('xml2js').parseString;

const config = {
  name: 'Longest Word',
  unique: {
    global: false
  }
};

const GAME_TIME = 30000; // 30 seconds
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * @module LongestWordGame
 */
class LongestWordGame {
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

    if (!process.env.hasOwnProperty('DICTIONARY_KEY')) {
      logger.error(`${config.name}: DICTIONARY_KEY is not set!`);
    }

    this.gametime = GAME_TIME; // Allow manual setting during testing

    this.game = {
      words: new Map(),
      start: LETTERS.charAt(Math.floor(Math.random() * LETTERS.length))
    };
    this.game.valid = new RegExp(`^${this.game.start}[\\w\\-]+$`, 'i');
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise}   A promise that resolves with a formatted help string
   */
  static help (bot) {
    const promise = new Promise((resolve) => {
      resolve(
        'A game where the gamebot will as for the longest word that begins with a letter\n' +
        `To play, type: @${bot.name} play ${config.name}\n` +
        'Once started, the bot will ask for a word that starts with a letter. ' +
        `Players will then have ${GAME_TIME / 1000} seconds to provide the longest ` +
        'word they can provide. At the end of the alloted time, the user who provided ' +
        'the longest _actual_ word wins!'
      );
    });

    return promise;
  }

  /**
   * Start game lifecycle
   * @param {object}  info     Information about the channel I started in
   * @return {Promise}       A promise that will resolve when the game is finished
   */
  start (info) {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.startChannel = info.channel;

      this.logger.info(`${config.name} Start Letter: ${this.game.start}`);

      this.bot.message({
        channel: info.channel,
        text: `A game of ${config.name} has been started. ` +
          'What\'s the longest word you know that starts with: ' +
          `*${this.game.start} ( ${this.game.start.toLowerCase()} )*\n` +
          `You have *${this.gametime / 1000}* seconds to say that word in this channel!`
      });

      setTimeout(() => {
        this.end();
      }, this.gametime);
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
      if (this.game.valid.test(message.text.trim())) {
        this.logger.info(`Adding ${message.text}`);
        const normalized = message.text.toLowerCase();
        if (!this.game.words.has(normalized)) {
          this.game.words.set(normalized, {
            user,
            word: message.text.trim(),
            message
          });
        }
      }

      resolve(); // no response
    });

    return promise;
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end () {
    this.bot.message({
      channel: this.game.startChannel,
      text: `Time's up! I got ${this.game.words.size} entries. Looking for longest...`
    });

    // sort based on word length and first to say word of length
    const sortedWords = Array.from(this.game.words.values()).sort((a, b) => {
      const diff = b.word.length - a.word.length;
      /* istanbul ignore next I don't really want to test matching timestamps */
      return diff !== 0 ? diff : b.ts - a.ts;
    });

    const lookups = [];
    sortedWords.forEach((word) => {
      lookups.push((cb) => {
        this.checkWord(word.word)
          .then((res) => {
            if (res) {
              cb(new Error('Found Word'), word); // the error stops the series
            } else {
              cb();
            }
          });
      });
    });

    async.series(lookups, (err, winner) => {
      if (err) {
        this.game.error(err);
      }
      const lastWord = winner.pop();
      if (lastWord) {
        this.bot.message({
          channel: this.game.startChannel,
          text: `The winner is *${lastWord.user.real_name}* with the word: ` +
            `*${lastWord.word}* (Length: ${lastWord.word.length})`
        });
        this.game.end({
          winner: lastWord.user.id,
          word: lastWord.word
        });
      } else {
        this.bot.message({
          channel: this.game.startChannel,
          text: 'No winner was found. Try spell check...'
        });
        this.game.end();
      }
    });

    return true;
  }

  /**
   * Checks a word to see if it's valid
   *
   * @param {string} word  the word to check
   * @return {Promise} A promise that will be resolved with a true/false
   */
  checkWord (word) {
    this.logger.info(`Checking ${word}`);
    return new Promise((resolve) => {
      request(
        'http://www.dictionaryapi.com/api/v1/references/collegiate/xml/' +
        `${word}?key=${process.env.DICTIONARY_KEY}`, (err, res, body) => {
        if (!err && res.statusCode === 200 && body) {
          parseString(body, (xmlErr, xml) => {
            if (!xmlErr) {
              const isWord = xml && xml.entry_list && xml.entry_list.entry;
              this.logger.info(`${word} ${isWord ? 'is' : 'is not'} a word`);
              resolve(isWord);
            } else {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Updates the stats for the Game
   * Stats Object:
   * {
   *  global: {
   *    plays: integer, number of times the game has been played
   *    records: {
   *      longest: {
   *        word: string, the longest winning word
   *        user: string, the user id who won with this word
   *      },
   *      shortest: {
   *        word: string, the shortest winning word
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
   *    longest: {
   *      word: string, the longest winning word
   *      user: string, the user id who won with this word
   *    },
   *    shortest: {
   *      word: string, the shortest winning word
   *      user: string, the user id who won with this word
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
          word: '',
          user: ''
        },
        shortest: {
          word: '',
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
        !newStats.records.longest.word ||
        newStats.records.longest.word.length < lastPlay.stats.word.length
      ) {
        newStats.records.longest = {
          word: lastPlay.stats.word,
          user: lastPlay.stats.winner
        };
      }

      if (
        !newStats.records.shortest.word ||
        newStats.records.shortest.word.length > lastPlay.stats.word.length
      ) {
        newStats.records.shortest = {
          word: lastPlay.stats.word,
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
        `Longest Winning Word: *${chanStats.records.longest.word}* ` +
        `(${longestUser ? longestUser.real_name : 'Unknown User'})\n` +
        `Shortest Winning Word: *${chanStats.records.shortest.word}* ` +
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
        `Longest Winning Word: *${stats.global.records.longest.word}* ` +
        `(${longestUser ? longestUser.real_name : 'Unknown User'})\n` +
        `Shortest Winning Word: *${stats.global.records.shortest.word}* ` +
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
  Game: LongestWordGame
};
