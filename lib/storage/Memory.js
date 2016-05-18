'use strict';

const Storage = require('./Storage').interface;

/**
 * @module MathGame
 */
class Memory extends Storage {
  /**
   * @constructor
   * @param {Object} config Any configuration for the object
   */
  constructor (config) {
    super(config);

    this.history = new Map();
    this.stats = new Map();
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
      resolve(this.stats.get(game) || {});
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
      resolve(this.history.get(game) || []);
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
    return new Promise((resolve) => {
      this.stats.set(game, stats);
      resolve(stats);
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
      const history = this.history.get(game) || [];
      history.push(play);
      this.history.set(game, history);
      resolve(true);
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
      this.history.delete(game);
      this.stats.delete(game);
      resolve(true);
    });
  }
}

module.exports = Memory;
