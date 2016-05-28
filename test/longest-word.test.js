'use strict';

const test = require('tape');
const nock = require('nock');
const LongestWordGame = require(`${process.env.PWD}/lib/games/longest-word`);
const logger = require(`${process.env.PWD}/lib/logger`)();

const lookup = new Map();

lookup.set('U00000000', {real_name: 'Mock User 1'});
lookup.set('U00000001', {real_name: 'Mock User 2'});
lookup.set('U00000002', {real_name: 'Mock User 3'});
lookup.set('U00000003', {real_name: 'Mock User 4'});
lookup.set('U00000004', {real_name: 'Mock User 5'});
lookup.set('U00000005', {real_name: 'Mock User 6'});

const mockBot = {
  self: {
    id: 'U023BECGF',
    name: 'bobby',
    prefs: {},
    created: 1402463766,
    manual_presence: 'active'
  },
  message: (response) => {
    logger.info(response);
  }
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
      key: process.env.DICTIONARY_KEY
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
      key: process.env.DICTIONARY_KEY
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
      key: process.env.DICTIONARY_KEY
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
      key: process.env.DICTIONARY_KEY
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
  assert.plan(11);

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
        key: process.env.DICTIONARY_KEY
      })
      .reply(200, word === winner ? xmlResponseGood : xmlResponseBad)
    );

    game.handleMessage({
      text: word
    }, {
      profile: {
        real_name: 'foo'
      }
    }).then(() => {
      assert.ok(game.game.words.has(word.toLowerCase()), `Guess ${word} should be accepted`);
    });
  });

  game.handleMessage({
    text: '0000'
  }, {
    profile: {
      real_name: 'foo'
    }
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
    originator: 'U00000000'
  };
  const history = [lastPlay];
  const expectedStats = {
    global: {
      plays: 1,
      records: {
        longest: {
          word: 'foo',
          user: 'U00000000'
        },
        shortest: {
          word: 'foo',
          user: 'U00000000'
        }
      },
      wins: [
        { user: 'U00000000', wins: 1 }
      ]
    },
    channels: {
      C00000000: {
        plays: 1,
        records: {
          longest: {
            word: 'foo',
            user: 'U00000000'
          },
          shortest: {
            word: 'foo',
            user: 'U00000000'
          }
        },
        wins: [
          { user: 'U00000000', wins: 1 }
        ]
      }
    }
  };

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.updateStats(stats, history, lastPlay)
    .then((newStats) => {
      assert.deepEqual(newStats, expectedStats, 'Initialize stats with first win');
    });
});

test('Longest Word: Update stats', (assert) => {
  assert.plan(4);
  const plays = [
    {
      play: {
        stats: { winner: 'U00000000', word: 'foo' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 1,
          records: {
            longest: {
              word: 'foo',
              user: 'U00000000'
            },
            shortest: {
              word: 'foo',
              user: 'U00000000'
            }
          },
          wins: [
            { user: 'U00000000', wins: 1 }
          ]
        },
        channels: {
          C00000000: {
            plays: 1,
            records: {
              longest: {
                word: 'foo',
                user: 'U00000000'
              },
              shortest: {
                word: 'foo',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 }
            ]
          }
        }
      }
    },
    {
      play: {
        stats: { winner: 'U00000001', word: 'fooo' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 2,
          records: {
            longest: {
              word: 'fooo',
              user: 'U00000001'
            },
            shortest: {
              word: 'foo',
              user: 'U00000000'
            }
          },
          wins: [
            { user: 'U00000000', wins: 1 },
            { user: 'U00000001', wins: 1 }
          ]
        },
        channels: {
          C00000000: {
            plays: 2,
            records: {
              longest: {
                word: 'fooo',
                user: 'U00000001'
              },
              shortest: {
                word: 'foo',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 },
              { user: 'U00000001', wins: 1 }
            ]
          }
        }
      }
    },
    {
      play: {
        stats: { winner: 'U00000000', word: 'baar' },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000001',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 3,
          records: {
            longest: {
              word: 'fooo',
              user: 'U00000001'
            },
            shortest: {
              word: 'foo',
              user: 'U00000000'
            }
          },
          wins: [
            { user: 'U00000000', wins: 2 },
            { user: 'U00000001', wins: 1 }
          ]
        },
        channels: {
          C00000000: {
            plays: 2,
            records: {
              longest: {
                word: 'fooo',
                user: 'U00000001'
              },
              shortest: {
                word: 'foo',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 },
              { user: 'U00000001', wins: 1 }
            ]
          },
          C00000001: {
            plays: 1,
            records: {
              longest: {
                word: 'baar',
                user: 'U00000000'
              },
              shortest: {
                word: 'baar',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 }
            ]
          }
        }
      }
    },
    {
      play: {
        stats: { }, // no winner
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000001',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 4,
          records: {
            longest: {
              word: 'fooo',
              user: 'U00000001'
            },
            shortest: {
              word: 'foo',
              user: 'U00000000'
            }
          },
          wins: [
            { user: 'U00000000', wins: 2 },
            { user: 'U00000001', wins: 1 }
          ]
        },
        channels: {
          C00000000: {
            plays: 2,
            records: {
              longest: {
                word: 'fooo',
                user: 'U00000001'
              },
              shortest: {
                word: 'foo',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 },
              { user: 'U00000001', wins: 1 }
            ]
          },
          C00000001: {
            plays: 2,
            records: {
              longest: {
                word: 'baar',
                user: 'U00000000'
              },
              shortest: {
                word: 'baar',
                user: 'U00000000'
              }
            },
            wins: [
              { user: 'U00000000', wins: 1 }
            ]
          }
        }
      }
    }
  ];

  const game = new LongestWordGame.Game(lookup, mockBot, logger);
  game.updateStats({}, [], plays[0].play)
    .then((newStats) => {
      assert.deepEqual(newStats, plays[0].expected, 'Initialize stats with first win');
      return game.updateStats(newStats, [], plays[1].play);
    })
    .then((newStats) => {
      assert.deepEqual(newStats, plays[1].expected, 'Update stats with second win');
      return game.updateStats(newStats, [], plays[2].play);
    })
    .then((newStats) => {
      assert.deepEqual(newStats, plays[2].expected, 'Update stats with third win');
      return game.updateStats(newStats, [], plays[3].play);
    })
    .then((newStats) => {
      assert.deepEqual(newStats, plays[3].expected, 'Update stats with no win');
    });
});

test('Longest Word: Format stats', (assert) => {
  const stats = {
    global: {
      plays: 22,
      records: {
        longest: {
          word: 'fooo',
          user: 'U00000001'
        },
        shortest: {
          word: 'foo',
          user: 'U00000000'
        }
      },
      wins: [
        { user: 'U00000000', wins: 7 },
        { user: 'U00000001', wins: 4 },
        { user: 'U00000002', wins: 3 },
        { user: 'U00000003', wins: 2 },
        { user: 'U00000004', wins: 1 },
        { user: 'U00000005', wins: 1 }
      ]
    },
    channels: {
      C00000000: {
        plays: 22,
        records: {
          longest: {
            word: 'fooo',
            user: 'U00000001'
          },
          shortest: {
            word: 'foo',
            user: 'U00000000'
          }
        },
        wins: [
          { user: 'U00000002', wins: 3 },
          { user: 'U00000003', wins: 2 }
        ]
      }
    }
  };

  const noStatsFormat = `There are no stats for ${LongestWordGame.config.name}! ` +
    'Play the game to create some!';

  const nonChannelFormat = '\n\n*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Longest Winning Word: *fooo* (Mock User 2)\n' +
    'Shortest Winning Word: *foo* (Mock User 1)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 1: 7\nMock User 2: 4\nMock User 3: 3\nMock User 4: 2\nMock User 5: 1';

  const expectedFormat = '*<#C00000000> Stats:*\n' +
    'Plays: *22*\n' +
    'Longest Winning Word: *fooo* (Mock User 2)\n' +
    'Shortest Winning Word: *foo* (Mock User 1)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 3: 3\nMock User 4: 2\n\n' +
    '*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Longest Winning Word: *fooo* (Mock User 2)\n' +
    'Shortest Winning Word: *foo* (Mock User 1)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 1: 7\nMock User 2: 4\nMock User 3: 3\nMock User 4: 2\nMock User 5: 1';

  assert.equal(LongestWordGame.Game.formatStats({}), noStatsFormat, 'Show message when no stats');
  assert.equal(
    LongestWordGame.Game.formatStats(stats, 'C00000001', lookup),
    nonChannelFormat, 'Format non-channel stats correctly'
  );
  assert.equal(
    LongestWordGame.Game.formatStats(stats, 'C00000000', lookup), expectedFormat, 'Format stats correctly'
  );
  assert.end();
});
