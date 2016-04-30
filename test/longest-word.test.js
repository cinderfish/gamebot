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

test('Longest Word: Update stats creates initial stat', (assert) => {
  assert.plan(1);
  const stats = {};
  const lastPlay = {
    stats: { winner: 'U00000000', word: 'foo' },
    start: 1461979341406,
    finish: 1461979371859,
    channel: 'C00000000',
    originator: 'U00000000',
  };
  const history = [lastPlay];
  const expectedStats = {
    plays: 1,
    records: {
      longest: {
        word: 'foo',
        user: 'U00000000',
      },
      shortest: {
        word: 'foo',
        user: 'U00000000',
      },
    },
    wins: [
      { user: 'U00000000', wins: 1 },
    ],
  };

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.updateStats(stats, history, lastPlay)
    .then((newStats) => {
      assert.deepEqual(newStats, expectedStats, 'Initialize stats with first win');
    });
});

test('Longest Word: Update stats', (assert) => {
  assert.plan(3);
  const plays = [
    {
      play: {
        stats: { winner: 'U00000000', word: 'foo' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000',
      },
      expected: {
        plays: 1,
        records: {
          longest: {
            word: 'foo',
            user: 'U00000000',
          },
          shortest: {
            word: 'foo',
            user: 'U00000000',
          },
        },
        wins: [
          { user: 'U00000000', wins: 1 },
        ],
      },
    },
    {
      play: {
        stats: { winner: 'U00000001', word: 'fooo' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000',
      },
      expected: {
        plays: 2,
        records: {
          longest: {
            word: 'fooo',
            user: 'U00000001',
          },
          shortest: {
            word: 'foo',
            user: 'U00000000',
          },
        },
        wins: [
          { user: 'U00000000', wins: 1 },
          { user: 'U00000001', wins: 1 },
        ],
      },
    },
    {
      play: {
        stats: { winner: 'U00000000', word: 'baar' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000',
      },
      expected: {
        plays: 3,
        records: {
          longest: {
            word: 'fooo',
            user: 'U00000001',
          },
          shortest: {
            word: 'foo',
            user: 'U00000000',
          },
        },
        wins: [
          { user: 'U00000000', wins: 2 },
          { user: 'U00000001', wins: 1 },
        ],
      },
    },
  ];

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.updateStats({}, [], plays[0].play)
    .then((newStats) => {
      assert.deepEqual(newStats, plays[0].expected, 'Initialize stats with first win');
      return game.updateStats(newStats, [], plays[1].play);
    }).then((newStats) => {
      assert.deepEqual(newStats, plays[1].expected, 'Update stats with second win');
      return game.updateStats(newStats, [], plays[2].play);
    }).then((newStats) => {
      assert.deepEqual(newStats, plays[2].expected, 'Update stats with third win');
    });
});

test('Longest Word: Format stats', (assert) => {
  const stats = {
    plays: 22,
    records: {
      longest: {
        word: 'fooo',
        user: 'U00000001',
      },
      shortest: {
        word: 'foo',
        user: 'U00000000',
      },
    },
    wins: [
      { user: 'U00000000', wins: 7 },
      { user: 'U00000001', wins: 4 },
      { user: 'U00000002', wins: 3 },
      { user: 'U00000003', wins: 2 },
      { user: 'U00000004', wins: 1 },
      { user: 'U00000005', wins: 1 },
    ],
  };

  const expectedFormat = '*Longest Word Stats:*\n' +
    'Plays: *22*\n' +
    'Longest Winning Word: *fooo* (<@U00000001>)\n' +
    'Shortest Winning Word: *foo* (<@U00000000>)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    '<@U00000000>: 7\n<@U00000001>: 4\n<@U00000002>: 3\n<@U00000003>: 2\n<@U00000004>: 1';

  assert.equal(LongestWordGame.Game.formatStats(stats), expectedFormat, 'Format stats correctly');
  assert.end();
});
