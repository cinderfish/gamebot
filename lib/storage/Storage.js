'use strict';

/**
 * @module Storage
 */
class Storage {
  /**
   * @constructor
   * @param {Object} config Any configuration for the object
   */
  constructor(config) {
    this.config = config;
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
  // getStats() {}

  /**
   * Get history for a game
   * @param {string} game The name of the game
   * @return {Promise} A promise that is resolved with the history for the game
   *                   or empty array for no stats
   *                   The promise is rejected if there is a db issue
   */
  // getHistory() {}

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
  // setStats() {}

  /**
   * Adds a play to the history of a game
   * @param {string} game The name of the game
   * @param {object} play Data about a play of the game
   * @return {Promise} A promise that is resolved with a truthy value
   *                   The promise is rejected if there is a db issue
   */
  // addPlay() {}
}

module.exports = {
  interface: Storage,
};
