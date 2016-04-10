# Slack Gamebot
A slack bot that plays games with you!

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

### Math
In this game, the bot will generate a random simple math problem. The first player to answer the problem correctly wins the round.

#### How To Play
- To start the game use the command `@botname play Math`
- The bot will ask how many rounds you wish to play. Anyone can answer.
- The bot will begin asking increasingly longer math questions.
- To answer, just say the correct number in the channel.
- The player with the most correct answers at then end of the rounds wins!

## Help
To get help from the bot, simply type `@botname help`.

To get help about a specific game, type `@botname help <game name>`

To get a list of games, type `@botname play`

To play a game, type `@botname play <game name>`

## Install
1. Clone this [repository](https://github.com/shaunburdick/gamebot.git)
2. `npm install`
3. Copy `./config.default.js` to `./config.js` and [fill it out](#configjs)
4. `npm start`

## config.js
The config file should be filled out as follows:

- slack:
  - token: string, Your slack token
  - autoReconnect: boolean, Reconnect on disconnect

## Docker
Build an image using `docker build -t your_image:tag`

Official Image [shaunburdick/gamebot](https://hub.docker.com/r/shaunburdick/gamebot/)

### Configuration Environment Variables
You can set the configuration of the bot by using environment variables. _ENVIRONMENT_VARIABLE_=Default Value
- _SLACK_TOKEN_=xoxb-foo, Your Slack Token
- _SLACK_AUTO_RECONNECT_=true, Reconnect on disconnect

Set them using the `-e` flag while running docker:

```
docker run -it \
-e SLACK_TOKEN=xobo-blarty-blar-blar \
shaunburdick/gamebot:latest
```

## Contributing
1. Create a new branch, please don't work in master directly.
2. ~Add failing tests for the change you want to make (if appliciable). Run `npm test` to see the tests fail.~
3. Fix stuff.
4. ~Run `npm test` to see if the tests pass. Repeat steps 2-4 until done.~
5. ~Check code coverage `npm run coverage` and add test paths as needed.~
6. Update the documentation to reflect any changes.
7. Push to your fork and submit a pull request.
