'use strict';

const config = {
  name: 'Hide and Seek',
  unique: {
    global: true
  }
};

const options = {
  maxTurns: 5
};

/**
 * @module HideSeekGame
 */
class HideSeekGame {
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

    // Game Options
    this.options = options;

    // Need a default user in case a new user joined slack after the game started
    this.defaultUser = {
      id: null,
      name: 'Unknown User'
    };

    this.defaultChannel = {
      id: null,
      name: 'Unknown Channel'
    };

    this.game = {
      id: null,
      isRunning: false,
      end: null,
      error: null,
      turnsLeft: null,
      inChannels: [],
      availableChannels: [],
      startingChannelId: null,
      hidingIn: null,
      finders: []
    };

    // Loop through the map
    this.map.forEach((item) => {
      if (item.is_channel && item.is_member && !item.is_archived) {
        this.game.inChannels.push(item);
        this.game.availableChannels.push(item);
      }
    });
  }

  /**
   * Static method to return help message that explains how to play the game
   * @param {object} bot Slack bot information
   * @return {Promise}   A promise that resolves with a formatted help string
   */
  static help (bot) {
    const promise = new Promise((resolve) => {
      resolve(
        'A game where the gamebot will hide in a random channel and you try to find it\n' +
        `To play, type: @${bot.name} play ${config.name}\n` +
        'Once hidden, go to any channel the bot has been invited to ' +
        `and type @${bot.name}.\nThe bot will let you know if you found ` +
        'it or not.  Once found, the bot will hide in another channel up to ' +
        `${options.maxTurns} time${options.maxTurns === 1 ? '' : 's'}.`
      );
    });

    return promise;
  }

  /**
   * Start game lifecycle
   * @param {string} channel The channel ID that started the game
   * @return {Promise}       A promise that will resolve when the game is finished
   */
  start (channel) {
    const promise = new Promise((resolve, reject) => {
      this.game.end = resolve;
      this.game.error = reject;

      this.game.id = this.generateId();
      this.game.turnsLeft = this.options.maxTurns || 5;

      if (this.game.turnsLeft > this.game.availableChannels.length) {
        this.game.turnsLeft = this.game.availableChannels.length;
      }

      if (!this.hide()) {
        this.game.error('Could not hide');
      }

      this.game.startingChannelId = channel.channel;

      this.game.isRunning = true;

      // Blast message to all "in" channels that the bot is now hiding
      const possibleChannels = this.game.availableChannels.reduce((prev, cur) => (
        prev ? `${prev}, <#${cur.id}>` : `<#${cur.id}>`
      ), '');
      this.game.inChannels.forEach((ch) => {
        this.bot.message({
          channel: ch.id,
          text: 'A game of Hide & Seek has been started, be the first to find me :eyes:\n' +
            `You can find me in: ${possibleChannels}`
        });
      });
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
  handleMessage (message) {
    const promise = new Promise((resolve, reject) => {
      if (!this.game.isRunning) {
        // Game isn't running, don't do anything
        resolve(true);
        return;
      }

      if (!this.game.hidingIn) {
        reject('Something went wrong, the game is running but bot is not hiding');
        return;
      }

      // Check the message type and do something
      if (message.type && message.type === 'message') {
        const user = this.map.get(message.user) || this.defaultUser;
        const channel = this.map.get(message.channel) || this.defaultChannel;

        switch (message.event) {
          case 'direct_mention':
            this.logger.info(`User @${user.name} searched in #${channel.name}`);

            // Check if the channel is the channel the bot is hiding in
            if (message.channel === this.game.hidingIn.id) {
              let response = `:clap: ${user.real_name} found me in <#${channel.id}>`;

              this.logger.info(`${user.real_name} found me in ${channel.name}`);

              this.addFinder(user);

              // Check # of turns left, if more turns left hide, else end game
              if (this.hide()) {
                response += ' - I found a new hiding spot, come find me.';
              } else {
                response += ` - Game Over!  See <#${this.game.startingChannelId}> for results`;

                // If there are no turns left and the bot was found, need
                // to decrement this one more so the end game will trigger
                this.game.turnsLeft--;
              }

              this.game.inChannels.forEach((ch) => {
                this.bot.message({
                  channel: ch.id,
                  text: response
                });
              });

              // If turns left is below 0, bot has nidden max times
              if (this.game.turnsLeft < 0) {
                this.end();
              }

              resolve({
                found: true,
                user: user.id,
                gameOver: false
              });
            } else {
              // Send message to the user in this channel that not in channel
              this.bot.message({
                channel: message.channel,
                text: this.getResponse(user.profile.first_name)
              });
              resolve({
                found: false,
                user: user.id,
                gameOver: true
              });
            }
            break;
          default:
            // Unexpected event type, don't do anything
            resolve({
              found: false,
              user: null,
              gameOver: false
            });
            return;
        }
      }
    });

    return promise;
  }

  /**
   * Generate random game ID
   * @return {Number} Random game number between 1000 - 9999
   */
  generateId () {
    return Math.floor(Math.random() * 9999) + 1000;
  }

  /**
   * Method used to hide the bot in a random channel
   * @return {boolean} True|False depending on success of hiding
   */
  hide () {
    if (!this.game.turnsLeft) {
      return false;
    }

    // Randomly pick a channel in this.game.availableChannels to hide in
    const idx = Math.floor(Math.random() * this.game.availableChannels.length);

    // if (this.game.hidingIn !== null) {
      // while (this.game.hidingIn.id === this.game.availableChannels[idx].id) {
        // idx = Math.floor(Math.random() * this.game.availableChannels.length);
      // }
    // }

    let tmp = null;

    if (this.game.hidingIn !== null) {
      // If bot is already in a room, then we'll need to eventually push it
      // back into the array of availableChannels
      tmp = this.game.hidingIn;
    }

    // Set the channel that the bot is hiding in
    this.game.hidingIn = this.game.availableChannels[idx];

    // Remove the channel that was just set to hiding, that way the Bot
    // doesn't hide in the same room twice in a row
    this.game.availableChannels.splice(idx, 1);

    // And finally, if bot was in a channel previously, add
    // that channel back to the list of available channels
    if (tmp !== null) {
      this.game.availableChannels.push(tmp);
    }

    // Decrement # of turns left
    this.game.turnsLeft--;

    this.logger.info(
      `Bot is hiding in ${this.game.hidingIn.name}, ` +
      `${this.game.turnsLeft} turn(s) left`
    );

    // Return true for now
    return true;
  }

  /**
   * Helper method to add a user to the finder list or increment
   * their current counter
   * @param {object}    user Slack user object
   * @returns {boolean}      Returns true always
   */
  addFinder (user) {
    let found = false;

    this.game.finders.forEach((finder, idx) => {
      if (finder.id === user.id) {
        this.game.finders[idx].count++;
        found = true;
      }
    });

    if (!found) {
      const idx = this.game.finders.push(user) - 1;
      this.game.finders[idx].count = 1;
    }

    return true;
  }

  /**
   * Get a random responses
   * @param  {string} name User's first name
   * @return {string}      A random response
   */
  getResponse (name) {
    const responses = [
      `Sorry ${name}, I'm not in this channel :ghost:`,
      'Whoops, not in here! :eyes:',
      'Not in here, try another channel :ghost:',
      `Are you even trying ${name}? :trollface:`,
      'No one can find me :cry:'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end () {
    const winner = {
      winner: null,
      score: null
    };

    const findersOut = this.game.finders.sort((a, b) => {
      if (a.count > b.count) {
        return -1;
      }
      if (a.count < b.count) {
        return 1;
      }
      return 0;
    }).map((u) => {
      if (!winner.winner && u) {
        winner.winner = u.id;
        winner.score = u.count;
      }
      return `>${u.real_name} - Found me ${u.count} time${u.count === 1 ? '' : 's'}`;
    });

    // Send a message back to the original channel with the results
    this.bot.message({
      channel: this.game.startingChannelId,
      text: '> Game Over :ghost:\n' +
        `${findersOut.join('\n')}`
    });

    // Resolve the promise which ends the game
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
  Game: HideSeekGame
};
