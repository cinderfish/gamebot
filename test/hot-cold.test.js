'use strict';

const test = require('tape');
const MathGame = require(`${process.env.PWD}/lib/games/hot-cold`);
const logger = require(`${process.env.PWD}/lib/logger`)();

const lookup = new Map();
const mockBot = {
  self: {
    id: 'U023BECGF',
    name: 'bobby',
    prefs: {},
    created: 1402463766,
    manual_presence: 'active',
  },
  message: (response) => {
    logger.info(response);
  },
};

test('Hot / Cold: Should instantiate game', (assert) => {
  const game = new MathGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Hot / Cold: Show Help', (assert) => {
  assert.plan(1);

  MathGame.Game.help(mockBot.self)
    .then((help) => {
      assert.equal(typeof help, 'string', 'Help should return a string');
    });
});
