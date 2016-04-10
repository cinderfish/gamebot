'use strict';

const config = {
  name: 'Hide and Seek',
  unique: {
    global: true,
  },
};

const options = {
  maxTurns: 5,
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
  constructor(map, bot, logger) {
    this.map = map;
    this.bot = bot;
    this.logger = logger;

    // Game Options
    this.options = options;

    // Need a default user in case a new user joined slack after the game started
    this.defaultUser = {
      id: null,
      name: 'Unknown User',
    };

    this.defaultChannel = {
      id: null,
      name: 'Unknown Channel',
    };

    this.init();

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
  static help(bot) {
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
  start(channel) {
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
      this.game.inChannels.forEach((ch) => {
        this.bot.message({
          channel: ch.id,
          text: 'A game of Hide & Seek has been started, be the first to find me :eyes:',
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
  handleMessage(message) {
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
              if (this.game.turnsLeft) {
                this.hide();
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
                  text: response,
                });
              });

              // If turns left is below 0, bot has nidden max times
              if (this.game.turnsLeft < 0) {
                this.end();
              }
            } else {
              // Send message to the user in this channel that not in channel
              this.bot.message({
                channel: message.channel,
                text: this.getResponse(user.profile.first_name),
              });
            }
            break;
          default:
            // Unexpected event type, don't do anything
            resolve(true);
            return;
        }
      }
    });

    return promise;
  }

  /**
   * Initialize game
   * @return {boolean} Returns true
   */
  init() {
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
      finders: [],
    };

    return true;
  }

  /**
   * Generate random game ID
   * @return {Number} Random game number between 1000 - 9999
   */
  generateId() {
    return Math.floor(Math.random() * 9999) + 1000;
  }

  /**
   * Method used to hide the bot in a random channel
   * @return {boolean} True|False depending on success of hiding
   */
  hide() {
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
   * Method to check if bot is currently in the provided channel
   * @param  {object} channelId Channel ID
   * @return {boolean}          Returns true if bot is in provided channel
   */
  inChannel(channelId) {
    let found = false;

    this.game.inChannels.forEach((channel) => {
      if (channel.id === channelId) {
        found = true;
      }
    });

    return found;
  }

  /**
   * Helper method to add a user to the finder list or increment
   * their current counter
   * @param {object}    user Slack user object
   * @returns {boolean}      Returns true always
   */
  addFinder(user) {
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
  getResponse(name) {
    const responses = [
      `Sorry ${name}, I'm not in this channel :ghost:`,
      'Whoops, not in here! :eyes:',
      'Not in here, try another channel :ghost:',
      `Are you even trying ${name}? :trollface:`,
      'No one can find me :cry:',
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Ends the game
   * @return {boolean} Returns true on success
   */
  end() {
    const findersOut = this.game.finders.sort((a, b) => {
      if (a.count > b.count) {
        return -1;
      }
      if (a.count < b.count) {
        return 1;
      }
      return 0;
    }).map((u) =>
      `>${u.real_name} - Found me ${u.count} time${u.count === 1 ? '' : 's'}`
    );

    // Send a message back to the original channel with the results
    this.bot.message({
      channel: this.game.startingChannelId,
      text: '> Game Over :ghost:\n' +
        `${findersOut.join('\n')}`,
    });

    // Resolve the promise which ends the game
    this.game.end();

    this.init();

    return true;
  }
}

module.exports = {
  config,
  Game: HideSeekGame,
};
