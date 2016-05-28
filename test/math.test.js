'use strict';

const test = require('tape');
const MathGame = require(`${process.env.PWD}/lib/games/math`);
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

test('Math: Should instantiate game', (assert) => {
  const game = new MathGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Math: Add Winners', (assert) => {
  const game = new MathGame.Game(lookup, mockBot, logger);
  const userId = 'U00000000';

  game.addWinner(userId, 1);
  assert.equal(game.winners.get(userId), 1, 'Instantiate winner');

  game.addWinner(userId, 2);
  assert.equal(game.winners.get(userId), 3, 'Add points to existing winner');

  assert.equal(game.winners.get('nope'), undefined, 'Not have an entry for non-winner');
  assert.end();
});

test('Math: Show Help', (assert) => {
  assert.plan(1);

  MathGame.Game.help(mockBot.self)
    .then((help) => {
      assert.equal(typeof help, 'string', 'Help should return a string');
    });
});

test('Math: Handle number of rounds to play', (assert) => {
  assert.plan(4);
  const game = new MathGame.Game(lookup, mockBot, logger);
  game.start(mockBot.self);
  game.handleMessage({ text: 'non-number' })
    .then(() => {
      assert.fail('Should not respond on non-number');
    });
  game.handleMessage({ text: '-1' })
    .then(() => {
      assert.equal(game.game.status, 1, 'No status change on negative number');
      return game.handleMessage({ text: '1000000' });
    })
    .then(() => {
      assert.equal(game.game.status, 1, 'No status change on large number');
      return game.handleMessage({ text: '10' });
    })
    .then(() => {
      assert.equal(game.game.status, 2, 'Status change on correct number of rounds');
      assert.equal(game.game.turns, 10, 'Turns is set to 10');
    });
});

test('Math: Ignore non-number answers', (assert) => {
  assert.plan(2);
  const game = new MathGame.Game(lookup, mockBot, logger);

  game.start(mockBot.self);
  game.handleMessage({ text: '5' })
    .then(() => {
      assert.equal(game.game.status, 2, 'Status change on correct number of rounds');
      assert.equal(game.game.turns, 5, 'Turns is set to 5');
      return game.handleMessage({ text: 'foo' });
    }).then(() => {
      assert.fail('Should not respond to non-number answers');
    });
});

test('Math: Respond to correct answer', (assert) => {
  assert.plan(5);
  const game = new MathGame.Game(lookup, mockBot, logger);
  const userId = 'U00000000';
  let initialQuestion;

  game.start(mockBot.self);
  game.handleMessage({ text: '5' })
    .then(() => {
      assert.equal(game.game.status, 2, 'Status change on correct number of rounds');
      assert.equal(game.game.turns, 5, 'Turns is set to 5');
      initialQuestion = game.game.question;
      return game.handleMessage({ text: game.game.question.solution }, {
        id: userId,
        profile: { real_name: 'Mock User 1' }
      });
    })
    .then((res) => {
      assert.equal(typeof res, 'string', 'Should return a response');
      assert.notEqual(
        game.game.question.solution, initialQuestion.solution, 'Should generate new question'
      );
      assert.equal(game.winners.get(userId), 1, 'Instantiate winner');
    })
    .catch((err) => {
      logger.error(err);
    });
});

test('Math: Respond to correct answer', (assert) => {
  assert.plan(5);
  const game = new MathGame.Game(lookup, mockBot, logger);
  const userId = 'U00000000';
  let initialQuestion;

  game.start(mockBot.self);
  game.handleMessage({ text: '5' })
    .then(() => {
      assert.equal(game.game.status, 2, 'Status change on correct number of rounds');
      assert.equal(game.game.turns, 5, 'Turns is set to 5');
      initialQuestion = game.game.question;
      return game.handleMessage({ text: game.game.question.solution }, {
        id: userId,
        profile: { real_name: 'Mock User 1' }
      });
    })
    .then((res) => {
      assert.equal(typeof res, 'string', 'Should return a response');
      assert.notEqual(
        game.game.question.solution, initialQuestion.solution, 'Should generate new question'
      );
      assert.equal(game.winners.get(userId), 1, 'Instantiate winner');
    })
    .catch((err) => {
      logger.error(err);
    });
});

test('Math: Ask the correct number of questions', (assert) => {
  assert.plan(7);
  const game = new MathGame.Game(lookup, mockBot, logger);
  const userId1 = 'U00000000';
  const userId2 = 'U00000001';
  let lastQuestion;

  game.start(mockBot.self)
    .then(() => {
      assert.pass('Game ended');
    });
  game.handleMessage({ text: '3' })
    .then(() => {
      assert.equal(game.game.status, 2, 'Status change on correct number of rounds');
      assert.equal(game.game.turns, 3, 'Turns is set to 3');
      lastQuestion = game.game.question;
      return game.handleMessage({ text: game.game.question.solution }, {
        id: userId1,
        profile: { real_name: 'Mock User 1' }
      });
    })
    .then((res) => {
      assert.equal(typeof res, 'string', 'Should return a response: turn 1');
      assert.notEqual(
        game.game.question.question, lastQuestion.question, 'Should generate new question: turn 2'
      );
      lastQuestion = game.game.question;
      return game.handleMessage({ text: game.game.question.solution }, {
        id: userId1,
        profile: { real_name: 'Mock User 1' }
      });
    })
    .then((res) => {
      assert.equal(typeof res, 'string', 'Should return a response: turn 2');
      assert.notEqual(
        game.game.question.question, lastQuestion.question, 'Should generate new question: turn 3'
      );
      lastQuestion = game.game.question;
      return game.handleMessage({ text: game.game.question.solution }, {
        id: userId2,
        profile: { real_name: 'Mock User 2' }
      });
    })
    .catch((err) => {
      logger.error(err);
    });
});

test('Math: Update stats creates initial stat', (assert) => {
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

  const game = new MathGame.Game(lookup, mockBot, logger);
  game.updateStats(stats, history, lastPlay)
    .then((newStats) => {
      assert.deepEqual(newStats, expectedStats, 'Initialize stats with first win');
    });
});

test('Math: Update stats', (assert) => {
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

  const game = new MathGame.Game(lookup, mockBot, logger);
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

test('Math: Format stats', (assert) => {
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

  const noStatsFormat = `There are no stats for ${MathGame.config.name}! ` +
    'Play the game to create some!';

  const nonChannelFormat = '\n\n*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *15* (Mock User 1)\n' +
    'Lowest Score: *6* (Mock User 2)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 1: 7\nMock User 2: 4\nMock User 3: 3\nMock User 4: 2\nMock User 5: 1';

  const expectedFormat = '*<#C00000000> Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *10* (Mock User 1)\n' +
    'Lowest Score: *10* (Mock User 2)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 6: 1\n\n' +
    '*Global Stats:*\n' +
    'Plays: *22*\n' +
    'Highest Score: *15* (Mock User 1)\n' +
    'Lowest Score: *6* (Mock User 2)\n\n' +
    '*Top 5:*\n--------------------------------------------------\n\n' +
    'Mock User 1: 7\nMock User 2: 4\nMock User 3: 3\nMock User 4: 2\nMock User 5: 1';

  assert.equal(MathGame.Game.formatStats({}), noStatsFormat, 'Show message when no stats');
  assert.equal(
    MathGame.Game.formatStats(stats, 'C00000001', lookup),
    nonChannelFormat, 'Format non-channel stats correctly'
  );
  assert.equal(
    MathGame.Game.formatStats(stats, 'C00000000', lookup), expectedFormat, 'Format stats correctly'
  );
  assert.end();
});
