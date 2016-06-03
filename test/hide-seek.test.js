'use strict';

const test = require('tape');
const HideSeekGame = require(`${process.env.PWD}/lib/games/hide-seek`);
const logger = require(`${process.env.PWD}/lib/logger`)();

const lookup = new Map();

const channelOne = {
  id: 'C00000000',
  is_channel: true,
  is_member: true,
  is_archived: false,
  name: 'Mock Channel 1'
};

const channelTwo = {
  id: 'C00000001',
  is_channel: true,
  is_member: true,
  is_archived: false,
  name: 'Mock Channel 2'
};

const channelThree = {
  id: 'C00000002',
  is_channel: true,
  is_member: false,
  is_archived: false,
  name: 'Mock Channel 3'
};

const channelFour = {
  id: 'C00000003',
  is_channel: true,
  is_member: true,
  is_archived: true,
  name: 'Mock Channel 4'
};

const channelFive = {
  id: 'C00000003',
  is_channel: true,
  is_member: true,
  is_archived: false,
  name: 'Mock Channel 4'
};

lookup.set('C00000000', channelOne);
lookup.set('C00000001', channelTwo);
lookup.set('C00000002', channelThree);
lookup.set('C00000003', channelFour);

lookup.set('U00000000', {id: 'U00000000', name: 'User 1', real_name: 'Mock User 1', profile: {first_name: 'User 1'}});
lookup.set('U00000001', {id: 'U00000001', name: 'User 2', real_name: 'Mock User 2'});
lookup.set('U00000002', {id: 'U00000002', name: 'User 3', real_name: 'Mock User 3'});
lookup.set('U00000003', {id: 'U00000003', name: 'User 4', real_name: 'Mock User 4'});
lookup.set('U00000004', {id: 'U00000004', name: 'User 5', real_name: 'Mock User 5'});
lookup.set('U00000005', {id: 'U00000005', name: 'User 6', real_name: 'Mock User 6'});

const lookupThreeChannels = new Map();

lookupThreeChannels.set('C00000000', channelOne);
lookupThreeChannels.set('C00000001', channelTwo);
lookupThreeChannels.set('C00000002', channelThree);
lookupThreeChannels.set('C00000003', channelFour);
lookupThreeChannels.set('C00000004', channelFive);

lookupThreeChannels.set('U00000000', {id: 'U00000000', name: 'User 1', real_name: 'Mock User 1'});
lookupThreeChannels.set('U00000001', {id: 'U00000001', name: 'User 2', real_name: 'Mock User 2'});

const lookupNoChannels = new Map();

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
  assert.plan(2);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  assert.ok(game);
  assert.deepEqual(game.bot, mockBot, 'Mock bot stored as bot');
  assert.end();
});

test('Hide and Seek: Should set turns left', (assert) => {
  assert.plan(2);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start();
  assert.ok(game);
  // There are 4 mock channels, one archived, one not a member of.  Leaving
  // two valid channels.  On `start()`, the bot calls `hide` which decrements
  // the turns left so should check for one less than valid number of channels
  assert.equal(game.game.turnsLeft, 1, 'Turns left set correctly');
  assert.end();
});

test('Hide and Seek: Should set starting channel', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'});
  assert.equal(game.game.startingChannelId, 'C00000000', 'Starting ChannelID set correctly');
  assert.end();
});

test('Hide and Seek: Hiding Channel should be one of the available channels', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'});
  const isValid = ['C00000000', 'C00000001'].indexOf(game.game.hidingIn.id) > -1;
  assert.equal(isValid, true, 'Hiding in valid channel');
  assert.end();
});

test('Hide and Seek: Doesn\'t respond to mention when not running', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.handleMessage({}).then((response) => {
    assert.equal(response, true, 'Valid response from game');
  });
});

test('Hide and Seek: Return correct winner for one guesser', (assert) => {
  assert.plan(2);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'}).then((response) => {
    assert.equal(response.winner, 'U00000000', 'Correct winner chosen');
    assert.equal(response.score, 2, 'Correct winner score returned');
    assert.end();
  });
  let channel = lookup.get(game.game.hidingIn.id);

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: channel.id,
    user: 'U00000000'
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000000'
    });
  });
});

test('Hide and Seek: Return correct winner in the event of a tie (FIFO)', (assert) => {
  assert.plan(2);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'}).then((response) => {
    assert.equal(response.winner, 'U00000001', 'Correct winner chosen');
    assert.equal(response.score, 1, 'Correct winner score returned');
    assert.end();
  });
  let channel = lookup.get(game.game.hidingIn.id);

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: channel.id,
    user: 'U00000001'
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000000'
    });
  });
});

test('Hide and Seek: Return winner if first guesser has more guesses', (assert) => {
  assert.plan(2);

  const game = new HideSeekGame.Game(lookupThreeChannels, mockBot, logger);
  game.start({channel: 'C00000000'}).then((response) => {
    assert.equal(response.winner, 'U00000001', 'Correct winner chosen');
    assert.equal(response.score, 2, 'Correct winner score returned');
    assert.end();
  });
  let channel = lookup.get(game.game.hidingIn.id);

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: channel.id,
    user: 'U00000001'
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000001'
    });
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000000'
    });
  });
});

test('Hide and Seek: Return winner if second guesser has more guesses', (assert) => {
  assert.plan(2);

  const game = new HideSeekGame.Game(lookupThreeChannels, mockBot, logger);
  game.start({channel: 'C00000000'}).then((response) => {
    assert.equal(response.winner, 'U00000001', 'Correct winner chosen');
    assert.equal(response.score, 2, 'Correct winner score returned');
    assert.end();
  });
  let channel = lookup.get(game.game.hidingIn.id);

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: channel.id,
    user: 'U00000000'
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000001'
    });
  }).then(() => {
    channel = lookup.get(game.game.hidingIn.id);
    return game.handleMessage({
      type: 'message',
      event: 'direct_mention',
      channel: channel.id,
      user: 'U00000001'
    });
  });
});

test('Hide and Seek: Should end game if hiding with no turns left', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'}).then((response) => {
    assert.pass('Game ended');
  });

  let channel = lookup.get(game.game.hidingIn.id);

  // Simulate an erroneous turns left counter
  game.game.turnsLeft--;

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: channel.id,
    user: 'U00000000'
  });
});

test('Hide and Seek: Should respond if unexpected message type sent', (assert) => {
  assert.plan(3);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'});

  game.handleMessage({
    type: 'message',
    event: 'foo'
  }).then((res) => {
    assert.equal(res.found, false, 'Correct found value returned');
    assert.equal(res.user, null, 'Correct user value returned');
    assert.equal(res.gameOver, false, 'Correct game status value returned');
  });
});

test('Hide and Seek: Should respond with appropriate message wrong channel chosen', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'});

  // Manually Set the hiding channel
  game.game.hidingIn = 'C00000000';

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: 'C00000001',
    user: 'U00000000'
  }).then((res) => {
    assert.equal(res.found, false, 'Correct found value returned');
  });
});

test('Hide and Seek: Should respond with error if playing but not hiding', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookup, mockBot, logger);
  game.start({channel: 'C00000000'});

  // Manually Set the hiding channel
  game.game.hidingIn = null;

  game.handleMessage({
    type: 'message',
    event: 'direct_mention',
    channel: 'C00000001',
    user: 'U00000000'
  }).then((res) => {
    assert.fail('Unexpected response');
  }).catch((err) => {
    const expectedErr = 'Something went wrong, the game is running but bot is not hiding';
    assert.equal(err, expectedErr, 'Received correct error message');
  });
});

test('Hide and Seek: Should reject game when it cannot hide', (assert) => {
  assert.plan(1);

  const game = new HideSeekGame.Game(lookupNoChannels, mockBot, logger);
  game.start({channel: 'C00000000'}).then((res) => {
    assert.fail('Unexpected response');
  }).catch((err) => {
    assert.equal(err, 'Could not hide', 'Received correct error message');
  });
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

  assert.equal(HideSeekGame.Game.formatStats({}), noStatsFormat, 'Show message when no stats');
  assert.equal(
    HideSeekGame.Game.formatStats(stats, 'C00000001', lookup),
    nonChannelFormat, 'Format non-channel stats correctly'
  );
  assert.equal(
    HideSeekGame.Game.formatStats(stats, 'C00000000', lookup), expectedFormat, 'Format stats correctly'
  );
  assert.end();
});
