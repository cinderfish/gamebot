# Slack Gamebot
[![Build Status](https://travis-ci.org/shaunburdick/gamebot.svg?branch=master)](https://travis-ci.org/shaunburdick/gamebot) [![Coverage Status](https://coveralls.io/repos/github/shaunburdick/gamebot/badge.svg?branch=master)](https://coveralls.io/github/shaunburdick/gamebot?branch=master) [![Docker Pulls](https://img.shields.io/docker/pulls/shaunburdick/gamebot.svg?maxAge=2592000)](https://hub.docker.com/r/shaunburdick/gamebot/)

A slack bot that plays games with you!

## History
This bot was originally written as part of a 24 hour hackathon: [HackUpsate vii](http://hackupstate.com/).

- [Games](#games)
  - [Hide and Seek](#hide-and-seek)
    - [How To Play](#how-to-play)
  - [Hot or Cold](#hot-or-cold)
    - [How To Play](#how-to-play)
  - [Longest Word](#longest-word)
    - [How To Play](#how-to-play)
  - [Math](#math)
    - [How To Play](#how-to-play)
- [Stats](#stats)
- [Help](#help)
- [Install](#install)
- [Data Storage](#data-storage)
- [config.js](#configjs)
- [Docker](#docker)
  - [Configuration Environment Variables](#configuration-environment-variables)
- [Contributing](#contributing)
- [Creating Your Own Game](#creating-your-own-game)

## Games
The game bot can play the following games:

### Hide and Seek
In this game, the bot will "hide" in a random room they are present in. Players then need to join the room (if they are not already in it) and say the bot's name. If they guess right before anyone else they win the round.

#### How To Play
- To start the game use the command `@botname play Hide and Seek`
- The bot will then announce the game has started
- Any player is free to find the bot by saying its name in a channel
- A player finds the bot if they are the first to say its name in the correct channel
- The player with the most "finds" at then end of the rounds wins!

### Hot or Cold
In this game, the bot will pick a random number between 1 and 100. Users then try to guess the game and the bot will give them hints based on how close they are.

#### How To Play
- To start the game use the command `@botname play Hot or Cold`
- The bot will then announce the game has started
- Any player is free to guess a number by entering it into the channel
- The player who correctly guesses the number wins!

### Longest Word
In this game, the bot will pick a random letter. Users then try to come up with the longest word that starts with that letter. The user that picks the longest word first wins!

**Note**: An API key from [dictionaryapi.com](http://www.dictionaryapi.com/) is needed for work lookup. You will need to set the DICTIONARY_KEY environmental variable with your key

#### How To Play
- To start the game use the command `@botname play Longest Word`
- The bot will then announce the game has started and which letter it has chosen.
- Any player is free to submit as many words as they would like in the channel.
- The user that picks the longest word first wins! Ties go to the first user to enter a word of that length.

### Math
In this game, the bot will generate a random simple math problem. The first player to answer the problem correctly wins the round.

#### How To Play
- To start the game use the command `@botname play Math`
- The bot will ask how many rounds you wish to play. Anyone can answer.
- The bot will begin asking increasingly longer math questions.
- To answer, just say the correct number in the channel.
- The player with the most correct answers at then end of the rounds wins!

## Stats
Games have the option of collecting and displaying statistics on games such as tracking winners and records.
Stats can be persisted to a database using various available drivers.

## Help
To get help from the bot, simply type `@botname help`.

To get help about a specific game, type `@botname help <game name>`

To get a list of games, type `@botname play`

To play a game, type `@botname play <game name>`

To get stats on a game, type `@botname stats <game name>`

## Install
1. Clone this [repository](https://github.com/shaunburdick/gamebot.git)
2. `npm install`
3. Copy `./config.default.js` to `./config.js` and [fill it out](#configjs)
4. `npm start`

## Data Storage
The bot can persist stats to various locations. By default stats will be persisted to memory.

### Memory
The Memory drive will persist the data in the apps memory. This means the stats will be lost if the app is restarted.

**Config**
None.

## config.js
The config file should be filled out as follows:

- slack:
  - token: string, Your slack token
  - autoReconnect: boolean, Reconnect on disconnect
- storage:
  - type: string, The driver to use. Defaults to Memory
  - config: object, any configuration to be passed to the driver

## Docker
Build an image using `docker build -t your_image:tag`

Official Image [shaunburdick/gamebot](https://hub.docker.com/r/shaunburdick/gamebot/)

### Configuration Environment Variables
You can set the configuration of the bot by using environment variables. ENVIRONMENT_VARIABLE=Default Value
- DICTIONARY_KEY=, An API key from [dictionaryapi.com](http://www.dictionaryapi.com/)
- SLACK_TOKEN=xoxb-foo, Your Slack Token
- SLACK_AUTO_RECONNECT=true, Reconnect on disconnect
- STORAGE_TYPE=Memory, The driver to use
- STORAGE_CONFIG='{json: true}', a json string to be converted to object

Set them using the `-e` flag while running docker:

```
docker run -it \
-e SLACK_TOKEN=xobo-blarty-blar-blar \
shaunburdick/gamebot:latest
```

## Contributing
1. Create a new branch, please don't work in master directly.
2. Add failing tests for the change you want to make (if appliciable). Run `npm test` to see the tests fail.
3. Fix stuff.
4. Run `npm test` to see if the tests pass. Repeat steps 2-4 until done.
5. Update the documentation to reflect any changes.
6. Push to your fork and submit a pull request.


## Creating Your Own Game
The `bot` was created in a way that makes adding your own games pretty easy.  Most of the communication with Slack is abstracted away from you, so all you have to worry about is the game logic and communicating with the player.  To create a new game, first create a new directory in `lib/games/` and add an `index.js`

`mkdir lib/games/my-new-game/ && touch lib/games/my-new-game/index.js`.

Each game is it's own class, the `bot` interface is expecting the following methods to be present:

The `constructor` is the method that is called when the game class is instantiated.  This method is a good spot to initialize your game (set up variables, state, etc).  The `bot` passes in three variables, `map` which contains a map of Slack ID's to users and channels.  This can be used later to look up a users information.  The `map` uses `.get(<some-id>)` to lookup user/channel details.  `bot` is all the information about the bot that instantiated the class such as the bot's name.  It also exposes a `message` method which can be used to push a message from your game out to Slack.  And lastly, the `logger` is an instance of a Winston wrapper that allows you to output debugging and logging info.

```
/**
 * Class constructor
 * @param  {object} map    Map of slack channels and user ids to info
 * @param  {object} bot    Information about the bot
 * @param  {Logger} logger Instance of logger utility
 */
constructor(map, bot, logger) {
  ...
}
```

Next up is the static `help` method, when a player types `@gamebot help <my-new-game-name>` the bot will run this method and reply with the help text.  This method takes one argument, `bot`, which is the information about the bot that is calling it.  Because the `help` method is static, the class hasn't been instantiated yet and the bot information wouldn't be available without passing it in here.

```
/**
 * Static method to return help message that explains how to play the game
 * @param {object} bot Slack bot information
 * @return {Promise}   A promise that resolves with a formatted help string
 */
static help(bot) {
  const promise = new Promise((resolve) => {
    resolve('My help text');
  });

  return promise;
}
```

On to the `start` method, this is what kicks off your game lifecycle.  This is called when a player types `@gamebot play <my-new-game-name>`.  The method takes an argument of `channel` which is information about the channel in which the game was started from.  Here's where you'd update the state of your app.  Two important things in this method are `this.game.end` and `this.game.error`.  The method (and most others) return promises that the bot uses to manage the state of a game.  When the game is finished, the `start` method should resolve it's promise using `this.game.end` which tells the bot that the game is over and tears down the instantiated class.  The promise should resolve with any stats you want to store.  You can use `this.game.error` at any time your game is running and it experiences an error.

```
/**
 * Start game lifecycle
 * @param {string} channel The channel ID that started the game
 * @return {Promise}       A promise that will resolve when the game is finished with stats
 */
start(channel) {
  const promise = new Promise((resolve, reject) => {
    this.game.end = resolve;
    this.game.error = reject;

    ...
  });
}
```

Next up is the heart of your game, the `handleMessage`.  This method is essentially your game loop.  When a message comes in to the bot from Slack, it dispatches it to any instantiated games.  Your game has to decide if it should respond to those messages.  The method takes a single argument of `message` which contains the message object received from Slack.  You can use things like `message.type` or `message.event` and the `message.text` to determine if your game needs to respond.  This method must return an Promise, if you need to send a message back you can pass text into your resolve and the bot will send a message to Slack.

```
/**
 * Handle incoming message
 * @param  {object} message Message object from Slack RTM api
 * @param  {object} user    User information
 * @param  {object} channel Channel information
 * @return {Promise}        A promise that resolves with an appropriate response
 */
handleMessage(message) {
  ...
}
```

The updateStats() function will be called at the end of every game. This allows your game to update any global/channel stats with new values from the last play. The function gets the current stats, the game history and the last play. It expects you to return the new stats object which will be saved over the previous stats. This function keeps you from having to build stats from the history every time.

```
/**
 * Updates the stats for the Game
 * @param {object}   stats    The previous stats object
 * @param {object[]} history  The game's stored history
 * @param {object}   lastPlay The last play through
 * @return {Promise} A promise that resolves with the new stats object to be stored
 */
updateStats(stats, history, lastPlay) {
  ...
}
```

The formatStats() function is called when a user asks for stats from your game. The function will be passed the latest stored stats object, what channel the call originated, and a new lookup object so you can map ids to users/channels. The bot expects your game to return a formatted string it can then send to slack as your representation of stats.

```
/**
 * Format the stats into a message
 *
 * @param {object} stats   the stats to format
 * @param {string} channel the stats to format
 * @param {Map}    lookup  A lookup map if needed
 * @return {string} the formated message
 */
static formatStats(stats, channel) {
  ...
}
```

And the last bit you need to add to the `index.js` is an export so the bot can include your game and configs.  Note that the `config.name` is what users will have to type to play.  The `config.unique.global` is used to deterine if there should only ever be one instance of your game running Slack wide.  If set to false, your game can be running in multiple channels.

```
module.exports = {
  config: {
    name: '<my-new-game-name>',
    unique: {
      global: true,
    },
  },
  Game: <my-new-class-name>,
};
```
