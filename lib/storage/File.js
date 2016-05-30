'use strict';

const Storage = require('./Storage').interface;
const Store = require('jfs');

/**
 * @module File
 */
class File extends Storage {
  /**
   * @constructor
   * @param {Object} config Any configuration for the object
   */
  constructor (config) {
    if (!config) {
      config = {};
    }

    if (!config.path) {
      config.path = `${process.env.PWD}/data/db`;
    }

    super(config);

    this.db = new Store(config.path, { type: 'single' });
  }

  /**
   * Getters
   */

  /**
   * Get stats for a game
   * @param {string} game The name of the game
   * @return {Promise} A promise that is resolved with the stats for the game
   *                   or empty object for no stats
   *                   The promise is rejected if there is a db issue
   */
  getStats (game) {
    return new Promise((resolve) => {
      this.getGame(game)
        .then((gameDB) => {
          resolve(gameDB.stats);
        });
    });
  }

  /**
   * Get history for a game
   * @param {string} game The name of the game
   * @return {Promise} A promise that is resolved with the history for the game
   *                   or empty array for no stats
   *                   The promise is rejected if there is a db issue
   */
  getHistory (game) {
    return new Promise((resolve) => {
      this.getGame(game)
        .then((gameDB) => {
          resolve(gameDB.history);
        });
    });
  }

  /**
   * Setters
   */

  /**
   * Sets stats for a game, this will overwrite the entire stats object
   * @param {string} game  The name of the game
   * @param {object} stats The new stats for the game
   * @return {Promise} A promise that is resolved with the stats for the game
   *                   or empty object for no stats
   *                   The promise is rejected if there is a db issue
   */
  setStats (game, stats) {
    return new Promise((resolve, reject) => {
      this.getGame(game)
        .then((gameDB) => {
          gameDB.stats = stats;
          this.db.saveSync(game, gameDB);
          resolve(stats);
        });
    });
  }

  /**
   * Adds a play to the history of a game
   * @param {string} game The name of the game
   * @param {object} play Data about a play of the game
   * @return {Promise} A promise that is resolved with a truthy value
   *                   The promise is rejected if there is a db issue
   */
  addPlay (game, play) {
    return new Promise((resolve) => {
      this.getGame(game)
        .then((gameDB) => {
          gameDB.history.push(play);
          this.db.saveSync(game, gameDB);
          resolve(true);
        });
    });
  }

  /**
   * Empties data for a game
   * @param {string} game The name of the game
   * @return {Promise} A promise that is resolved with a truthy value
   *                   The promise is rejected if there is a db issue
   */
  deleteGame (game) {
    return new Promise((resolve) => {
      this.db.deleteSync(game);
      resolve(true);
    });
  }

  /**
   * Returns a game or a pre-built object
   *
   * @param {string} game The name of the game
   * @return {Promise} A promise that is resolved with a game object
   *                   The promise is rejected if there is a db issue
   */
  getGame (game) {
    return new Promise((resolve, reject) => {
      this.db.get(game, (err, gameDB) => {
        if (err) {
          gameDB = {
            stats: {},
            history: []
          };
        }

        resolve(gameDB);
      });
    });
  }
}

module.exports = File;
