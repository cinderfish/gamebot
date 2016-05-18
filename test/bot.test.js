'use strict';

const test = require('tape');
const fs = require('fs');
const Bot = require(`${process.env.PWD}/lib/bot`);
const configDist = require(`${process.env.PWD}/config.default.js`);

test('Bot: instantiate and set config', (assert) => {
  const bot = new Bot(configDist);
  assert.equal(bot.config, configDist);
  assert.end();
});

test('Bot: should load games', (assert) => {
  const bot = new Bot(configDist);
  const games = fs.readdirSync(`${process.env.PWD}/lib/games`);
  assert.equal(bot.games.size, games.length, 'Should load a game per directory');
  assert.end();
});

test('Bot: should populate lookup', (assert) => {
  const bot = new Bot(configDist);
  const samplePayload = {
    users: [
      { id: 1 }, { id: 2 }
    ],
    channels: [
      { id: 3 }, { id: 4 }
    ],
    groups: [
      { id: 5 }, { id: 6 }
    ],
    mpims: [
      { id: 7 }, { id: 8 }
    ]
  };

  bot.populateLookup(samplePayload);
  assert.equal(bot.lookup.size, 8, 'Lookup should contain entry for each item');
  assert.end();
});

test('Bot: validate a command', (assert) => {
  const bot = new Bot(configDist);
  assert.ok(bot.isCommand('help'));
  assert.ok(bot.isCommand('I need help'));
  assert.ok(bot.isCommand('help me'));
  assert.ok(bot.isCommand('HELP'));
  assert.ok(bot.isCommand('heLP'));
  assert.ok(bot.isCommand('play'));
  assert.ok(bot.isCommand('I want to play'));
  assert.ok(bot.isCommand('play with me'));
  assert.ok(bot.isCommand('PLAY'));
  assert.ok(bot.isCommand('plAY'));

  assert.notOk(bot.isCommand(''));
  assert.notOk(bot.isCommand('pewp'));

  assert.end();
});
