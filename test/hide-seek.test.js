'use strict';

const test = require('tape');
const HideSeekGame = require(`${process.env.PWD}/lib/games/hide-seek`);
const logger = require(`${process.env.PWD}/lib/logger`)();

const lookup = new Map();
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

test('Hide and Seek: Should instantiate game', (assert) => {
  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Hide and Seek: Show Help', (assert) => {
  assert.plan(1);

  HideSeekGame.Game.help(mockBot.self)
    .then((help) => {
      assert.equal(typeof help, 'string', 'Help should return a string');
    });
});

test('Hide and Seek: Generate ID', (assert) => {
  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  assert.notEqual(game.generateId(), game.generateId(), 'Generate unique ids');
  assert.end();
});

test('Hide and Seek: Get Response', (assert) => {
  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  assert.ok(game.getResponse('foo').length, 'Response should have length');
  assert.end();
});

test('Hide and Seek: Update stats creates initial stat', (assert) => {
  assert.plan(1);
  const stats = {};
  const lastPlay = {
    stats: { winner: 'U00000000', score: 15 },
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
        highest: {
          score: 15,
          user: 'U00000000'
        },
        lowest: {
          score: 15,
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
          highest: {
            score: 15,
            user: 'U00000000'
          },
          lowest: {
            score: 15,
            user: 'U00000000'
          }
        },
        wins: [
          { user: 'U00000000', wins: 1 }
        ]
      }
    }
  };

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.updateStats(stats, history, lastPlay)
    .then((newStats) => {
      assert.deepEqual(newStats, expectedStats, 'Initialize stats with first win');
    });
});

test('Hide and Seek: Update stats', (assert) => {
  assert.plan(4);
  const plays = [
    {
      play: {
        stats: { winner: 'U00000000', score: 15 },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 1,
          records: {
            highest: {
              score: 15,
              user: 'U00000000'
            },
            lowest: {
              score: 15,
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
              highest: {
                score: 15,
                user: 'U00000000'
              },
              lowest: {
                score: 15,
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
        stats: { winner: 'U00000001', score: 6 },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000000',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 2,
          records: {
            highest: {
              score: 15,
              user: 'U00000000'
            },
            lowest: {
              score: 6,
              user: 'U00000001'
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
              highest: {
                score: 15,
                user: 'U00000000'
              },
              lowest: {
                score: 6,
                user: 'U00000001'
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
        stats: { winner: 'U00000000', score: 10 },
        start: 1461979341406,
        finish: 1461979371859,
        channel: 'C00000001',
        originator: 'U00000000'
      },
      expected: {
        global: {
          plays: 3,
          records: {
            highest: {
              score: 15,
              user: 'U00000000'
            },
            lowest: {
              score: 6,
              user: 'U00000001'
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
              highest: {
                score: 15,
                user: 'U00000000'
              },
              lowest: {
                score: 6,
                user: 'U00000001'
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
              highest: {
                score: 10,
                user: 'U00000000'
              },
              lowest: {
                score: 10,
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
            highest: {
              score: 15,
              user: 'U00000000'
            },
            lowest: {
              score: 6,
              user: 'U00000001'
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
              highest: {
                score: 15,
                user: 'U00000000'
              },
              lowest: {
                score: 6,
                user: 'U00000001'
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
              highest: {
                score: 10,
                user: 'U00000000'
              },
              lowest: {
                score: 10,
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

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
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

test('Hide and Seek: Format stats', (assert) => {
  const stats = {
    global: {
      plays: 22,
      records: {
        highest: {
          score: 15,
          user: 'U00000000'
        },
        lowest: {
          score: 6,
          user: 'U00000001'
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
          highest: {
            score: 10,
            user: 'U00000000'
          },
          lowest: {
            score: 10,
            user: 'U00000001'
          }
        },
        wins: [
          { user: 'U00000005', wins: 1 }
        ]
      }
    }
  };

  const noStatsFormat = `There are no stats for ${HideSeekGame.config.name}! ` +
    'Play the game to create some!';

  const nonChannelFormat = '\n\n*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *15* (<@U00000000>)\n' +
    'Lowest Score: *6* (<@U00000001>)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    '<@U00000000>: 7\n<@U00000001>: 4\n<@U00000002>: 3\n<@U00000003>: 2\n<@U00000004>: 1';

  const expectedFormat = '*<#C00000000> Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *10* (<@U00000000>)\n' +
    'Lowest Score: *10* (<@U00000001>)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    '<@U00000005>: 1\n\n' +
    '*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *15* (<@U00000000>)\n' +
    'Lowest Score: *6* (<@U00000001>)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    '<@U00000000>: 7\n<@U00000001>: 4\n<@U00000002>: 3\n<@U00000003>: 2\n<@U00000004>: 1';

  assert.equal(HideSeekGame.Game.formatStats({}), noStatsFormat, 'Show message when no stats');
  assert.equal(
    HideSeekGame.Game.formatStats(stats, 'C00000001'),
    nonChannelFormat, 'Format non-channel stats correctly'
  );
  assert.equal(
    HideSeekGame.Game.formatStats(stats, 'C00000000'), expectedFormat, 'Format stats correctly'
  );
  assert.end();
});
