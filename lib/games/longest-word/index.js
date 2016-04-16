'use strict';

const request = require('request');
const async = require('async');
const parseString = require('xml2js').parseString;

const config = {
  name: 'Longest Word',
  unique: {
    global: false,
  },
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
  constructor(map, bot, logger) {
    this.map = map;
    this.bot = bot;
    this.logger = logger;

    this.game = {
      words: new Map(),
    };
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise}   A promise that resolves with a formatted help string
   */
  static help(bot) {
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
   * @param {object} info Information about the channel I started in
   * @return {Promise}       A promise that will resolve when the game is finished
   */
  start(info) {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.startChannel = info.channel;
      this.game.start = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
      this.game.valid = new RegExp(`^${this.game.start}[\\w\\-]+$`, 'i');
      this.logger.info(this.game.valid);

      this.logger.info(`${config.name} Start Letter: ${this.game.start}`);

      this.bot.message({
        channel: info.channel,
        text: `A game of ${config.name} has been started. ` +
          `What's the longest word you know that starts with: *${this.game.start}*\n` +
          `You have *${GAME_TIME / 1000}* seconds to say that word in this channel!`,
      });

      setTimeout(() => {
        this.end();
      }, GAME_TIME);
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
      if (this.game.valid.test(message.text.trim())) {
        this.logger.info(`Adding ${message.text}`);
        const normalized = message.text.toLowerCase();
        if (!this.game.words.has(normalized)) {
          this.game.words.set(normalized, {
            user,
            word: message.text.trim(),
            message,
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
  end() {
    this.bot.message({
      channel: this.game.startChannel,
      text: `Time's up! I got ${this.game.words.size} entries. Looking for longest...`,
    });

    // sort based on word length and first to say word of length
    const sortedWords = Array.from(this.game.words.values()).sort((a, b) => {
      const diff = b.word.length - a.word.length;
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
              cb(null, word);
            }
          });
      });
    });

    async.series(lookups, (err, winner) => {
      const lastWord = winner.pop();
      if (lastWord) {
        this.bot.message({
          channel: this.game.startChannel,
          text: `The winner is *${lastWord.user.real_name}* with the word: *${lastWord.word}*`,
        });
      } else {
        this.bot.message({
          channel: this.game.startChannel,
          text: 'No winner was found. Try spell check...',
        });
      }

      this.game.end();
    });

    return true;
  }

  /**
   * Checks a word to see if it's valid
   *
   * @param {string} word  the word to check
   * @return {Promise} A promise that will be resolved with a true/false
   */
  checkWord(word) {
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
}

module.exports = {
  config,
  Game: LongestWordGame,
};
