'use strict';

const Storage = require('./Storage').interface;
const FB = require('firebase');

const KEY_STATS = 'stats';
const KEY_HISTORY = 'history';

/**
 * @module MathGame
 */
class Firebase extends Storage {
  /**
   * @constructor
   * @param {Object} config Any configuration for the object
   */
  constructor (config) {
    super(config);

    if (!config || !config.uri) {
      throw new Error('Missing Firebase URI');
    }

    this.root = new FB(config.uri);
    this.history = this.root.child(KEY_HISTORY);
    this.stats = this.root.child(KEY_STATS);
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
    return new Promise((resolve, reject) => {
      this.stats.child(game).once('value')
        .then((stats) => {
          resolve(stats.val() || {});
        })
        .catch((err) => {
          /* istanbul ignore next Not testing failed connections */
          reject(err);
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
    return new Promise((resolve, reject) => {
      this.history.child(game).once('value')
        .then((stats) => {
          resolve(stats.val() || []);
        })
        .catch((err) => {
          /* istanbul ignore next Not testing failed connections */
          reject(err);
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
      this.stats.child(game).set(stats)
        .then((err) => {
          /* istanbul ignore next Not testing failed connections */
          if (err) {
            /* istanbul ignore next Not testing failed connections */
            reject(err);
          }

          resolve(stats);
        })
        .catch((err) => {
          /* istanbul ignore next Not testing failed connections */
          reject(err);
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
    return new Promise((resolve, reject) => {
      this.getHistory(game)
        .then((history) => {
          history.push(play);
          this.history.child(game).set(history)
            .then((err) => {
              /* istanbul ignore next Not testing failed connections */
              if (err) {
                /* istanbul ignore next Not testing failed connections */
                reject(err);
              }

              resolve(true);
            })
            .catch((err) => {
              /* istanbul ignore next Not testing failed connections */
              reject(err);
            });
        })
        .catch((err) => {
          /* istanbul ignore next Not testing failed connections */
          reject(err);
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
    return new Promise((resolve, reject) => {
      Promise.all([
        this.history.child(game).remove(),
        this.stats.child(game).remove()
      ])
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        /* istanbul ignore next Not testing failed connections */
        reject(err);
      });
    });
  }
}

module.exports = Firebase;
