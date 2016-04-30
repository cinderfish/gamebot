'use strict';

const test = require('tape');
const Memory = require(`${process.env.PWD}/lib/storage/Memory`);

test('Storage/Memory: Sets config', (assert) => {
  const config = {
    foo: 'bar',
  };

  const mem = new Memory(config);
  assert.deepEqual(mem.config, config, 'Config should be set in new class');
  assert.end();
});

test('Storage/Memory: Store/Retrieve Stats', (assert) => {
  assert.plan(4);
  const game = 'foo';
  const stats = {
    foo: 'bar',
  };
  const newStats = {
    bar: 'foo',
  };

  const mem = new Memory();
  mem.setStats(game, stats)
    .then((savedStats) => {
      assert.deepEqual(stats, savedStats, 'Should save stats');
      return mem.getStats(game);
    }).then((gottenStats) => {
      assert.deepEqual(stats, gottenStats, 'Should fetch stats');
      return mem.setStats(game, newStats);
    }).then((savedNewSavedStats) => {
      assert.deepEqual(newStats, savedNewSavedStats, 'Should fetch new overwritten stats');
    });

  mem.getStats('na')
    .then((noStats) => {
      assert.deepEqual(noStats, {}, 'Should get empty object when there is no stats');
    });
});

test('Storage/Memory: Store/Retrieve History', (assert) => {
  assert.plan(5);
  const game = 'foo';
  const play = {
    foo: 'bar',
  };

  const mem = new Memory();
  mem.addPlay(game, play)
    .then((res) => {
      assert.ok(res, 'Should save play');
      return mem.getHistory(game);
    }).then((gottenHistory) => {
      assert.deepEqual([play], gottenHistory, 'Should fetch history');
      return mem.addPlay(game, play);
    }).then((res) => {
      assert.ok(res, 'Should save play');
      return mem.getHistory(game);
    }).then((gottenHistory) => {
      assert.deepEqual([play, play], gottenHistory, 'Should fetch new history');
    });

  mem.getHistory('na')
    .then((noHistory) => {
      assert.deepEqual(noHistory, [], 'Should get empty array when there is no history');
    });
});
