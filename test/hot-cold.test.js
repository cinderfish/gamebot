'use strict';

const test = require('tape');
const HotColdGame = require(`${process.env.PWD}/lib/games/hot-cold`);
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
  const game = new HotColdGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Hot / Cold: Show Help', (assert) => {
  assert.plan(1);

  HotColdGame.Game.help(mockBot.self)
    .then((help) => {
      assert.equal(typeof help, 'string', 'Help should return a string');
    });
});

test('Hot / Cold: Should pick a random number', (assert) => {
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();
  assert.ok(game.game.answer > 0, 'Random number should be greater than 0');
  assert.ok(game.game.answer < 101, 'Random number should be less than 101');
  assert.end();

  game.end(); // Get the promise to resolve
});

test('Hot / Cold: Respond to guess', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  const guess = game.game.answer - 1;
  game.handleMessage({
    text: guess,
  }).then((response) => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
    assert.equal(response, `${guess} is Red Hot!`);
  });
});

test('Hot / Cold: Respond to close guess', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  const guess = game.game.answer - 6;
  game.handleMessage({
    text: guess,
  }).then((response) => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
    assert.equal(response, `${guess} is Hot!`);
  });
});

test('Hot / Cold: Respond to close guess', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  const guess = game.game.answer - 11;
  game.handleMessage({
    text: guess,
  }).then((response) => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
    assert.equal(response, `${guess} is Warm!`);
  });
});

test('Hot / Cold: Respond to close-ish guess', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  const guess = game.game.answer - 21;
  game.handleMessage({
    text: guess,
  }).then((response) => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
    assert.equal(response, `${guess} is Cold!`);
  });
});

test('Hot / Cold: Respond to way off guess', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  const guess = game.game.answer - 31;
  game.handleMessage({
    text: guess,
  }).then((response) => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
    assert.equal(response, `${guess} is Freezing Cold!`);
  });
});

test('Hot / Cold: Ignore non-numeric answer', (assert) => {
  assert.plan(1);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start();

  game.handleMessage({
    text: 'foo',
  }).then(() => {
    assert.fail('Should not have gotten a response');
  });

  assert.pass('No response given');
});

test('Hot / Cold: Detect correct answer', (assert) => {
  assert.plan(2);
  const game = new HotColdGame.Game(lookup, mockBot, logger);

  game.start({
    channel: 'foo',
  }).then(() => {
    assert.pass('Game was completed');
  }).catch((err) => {
    logger.error(err);
  });

  game.handleMessage({
    text: game.game.answer,
  }, {
    profile: {
      real_name: 'foo',
    },
  }).then(() => {
    assert.equal(game.game.guesses, 1, 'Increment Guesses');
  });
});
