'use strict';

const test = require('tape');
const nock = require('nock');
const LongestWordGame = require(`${process.env.PWD}/lib/games/longest-word`);
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

test('Longest Word: Should instantiate game', (assert) => {
  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Longest Word: Show Help', (assert) => {
  assert.plan(1);

  LongestWordGame.Game.help(mockBot.self)
    .then((help) => {
      assert.equal(typeof help, 'string', 'Help should return a string');
    });
});

test('Longest Word: Check for valid word', (assert) => {
  assert.plan(2);

  process.env.DICTIONARY_KEY = 'bar';
  const word = 'foo';
  const xmlResponse = '<entry_list version="1.0">' +
    '<entry id="test[1]"></entry>' +
    '</entry_list>';

  const dictionaryapi = nock('http://www.dictionaryapi.com/')
    .get(`/api/v1/references/collegiate/xml/${word}`)
    .query({
      key: process.env.DICTIONARY_KEY,
    })
    .reply(200, xmlResponse);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.checkWord(word)
    .then((result) => {
      assert.ok(result, 'Word should check as true');
      assert.ok(dictionaryapi.isDone(), 'Mock endpoint should be called');
    });
});

test('Longest Word: Check for invalid word', (assert) => {
  assert.plan(2);

  process.env.DICTIONARY_KEY = 'bar';
  const word = 'foo';
  const xmlResponse = '<entry_list version="1.0">' +
    '</entry_list>';

  const dictionaryapi = nock('http://www.dictionaryapi.com/')
    .get(`/api/v1/references/collegiate/xml/${word}`)
    .query({
      key: process.env.DICTIONARY_KEY,
    })
    .reply(200, xmlResponse);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.checkWord(word)
    .then((result) => {
      assert.notOk(result, 'Word should check as false');
      assert.ok(dictionaryapi.isDone(), 'Mock endpoint should be called');
    });
});

test('Longest Word: Check for invalid XML', (assert) => {
  assert.plan(2);

  process.env.DICTIONARY_KEY = 'bar';
  const word = 'foo';
  const xmlResponse = '<entry_list version="1.0">' +
    '<entry id="test[1]"></entry>' +
    '</entry_list1111>';

  const dictionaryapi = nock('http://www.dictionaryapi.com/')
    .get(`/api/v1/references/collegiate/xml/${word}`)
    .query({
      key: process.env.DICTIONARY_KEY,
    })
    .reply(200, xmlResponse);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.checkWord(word)
    .then((result) => {
      assert.notOk(result, 'Word should check as false');
      assert.ok(dictionaryapi.isDone(), 'Mock endpoint should be called');
    });
});

test('Longest Word: Check for invalid response code', (assert) => {
  assert.plan(2);

  process.env.DICTIONARY_KEY = 'bar';
  const word = 'foo';

  const dictionaryapi = nock('http://www.dictionaryapi.com/')
    .get(`/api/v1/references/collegiate/xml/${word}`)
    .query({
      key: process.env.DICTIONARY_KEY,
    })
    .reply(500);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.checkWord(word)
    .then((result) => {
      assert.notOk(result, 'Word should check as false');
      assert.ok(dictionaryapi.isDone(), 'Mock endpoint should be called');
    });
});

test('Longest Word: Should generate starting letter', (assert) => {
  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  assert.equal(typeof game.game.start, 'string', 'Start should be a letter');
  assert.end();
});

test('Longest Word: Should start/stop', (assert) => {
  assert.plan(1);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.gametime = 100; // Shorten gametime

  game.start(mockBot.self)
    .then((lastWord) => {
      assert.notOk(lastWord, 'No match should have been found');
    });
});

test('Longest Word: Should correctly find a match', (assert) => {
  assert.plan(12);

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  process.env.DICTIONARY_KEY = 'bar';

  const wordList = (() => {
    const retVal = [];

    for (let x = 0; x < 9; x++) {
      retVal.push(
        `${game.game.start}${Array(x + 1).fill('a').join('')}`
      );
    }

    // Add a duplicate for dupe testing
    retVal.push(retVal[0]);

    return retVal;
  })();
  const winner = wordList[Math.floor(Math.random() * (wordList.length - 1))];
  const apiCalls = [];
  const xmlResponseGood = '<entry_list version="1.0">' +
    '<entry id="test[1]"></entry>' +
    '</entry_list>';
  const xmlResponseBad = '<entry_list version="1.0">' +
    '</entry_list>';

  game.gametime = 1000; // Shorten gametime
  game.start(mockBot.self)
    .then((lastWord) => {
      assert.equal(lastWord.word, winner, `${winner} should be found as the winner`);
    });

  wordList.forEach((word) => {
    apiCalls.push(nock('http://www.dictionaryapi.com/')
      .get(`/api/v1/references/collegiate/xml/${word}`)
      .query({
        key: process.env.DICTIONARY_KEY,
      })
      .reply(200, word === winner ? xmlResponseGood : xmlResponseBad)
    );

    game.handleMessage({
      text: word,
    }, {
      profile: {
        real_name: 'foo',
      },
    }).then(() => {
      assert.ok(game.game.words.has(word.toLowerCase()), `Guess ${word} should be accepted`);
    });
  });

  game.handleMessage({
    text: '0000',
  }, {
    profile: {
      real_name: 'foo',
    },
  }).then(() => {
    assert.notOk(game.game.words.has('0000'), 'Guess 0000 should NOT be accepted');
  });
});
