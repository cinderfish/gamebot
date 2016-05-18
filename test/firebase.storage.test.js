'use strict';

const test = require('tape');
const Firebase = require(`${process.env.PWD}/lib/storage/Firebase`);
const FirebaseServer = require('firebase-server');

let server = new FirebaseServer(5000, '127.0.1');

const config = {
  uri: 'ws://127.0.1:5000/unit-test/'
};

test('Storage/Firebase: Sets config', (assert) => {
  const fb = new Firebase(config);
  assert.deepEqual(fb.config, config, 'Config should be set in new class');
  assert.end();
});

test('Storage/Firebase: Delete a game', (assert) => {
  assert.plan(3);
  const game = 'delete-me';
  const play = {
    foo: 'bar'
  };
  const stats = {
    foo: 'bar'
  };

  const fb = new Firebase(config);
  Promise.all([
    fb.addPlay(game, play),
    fb.setStats(game, stats)
  ])
    .then(() => fb.deleteGame(game))
    .then((res) => {
      assert.ok(res, 'Delete should return truthy value');
      return Promise.all([
        fb.getStats(game),
        fb.getHistory(game)
      ]);
    })
    .then((res) => {
      res.forEach((item) => {
        if (Array.isArray(item)) {
          assert.deepEqual(item, [], 'History should be empty');
        } else {
          assert.deepEqual(item, {}, 'Stats should be empty');
        }
      });
    });
});

test('Storage/Firebase: Store/Retrieve Stats', (assert) => {
  assert.plan(4);
  const game = 'unit-test-1';
  const stats = {
    foo: 'bar'
  };
  const newStats = {
    bar: 'foo'
  };

  const fb = new Firebase(config);
  fb.deleteGame(game)
    .then(() => {
      fb.setStats(game, stats)
        .then((savedStats) => {
          assert.deepEqual(stats, savedStats, 'Should save stats');
          return fb.getStats(game);
        })
        .then((gottenStats) => {
          assert.deepEqual(stats, gottenStats, 'Should fetch stats');
          return fb.setStats(game, newStats);
        })
        .then((savedNewSavedStats) => {
          assert.deepEqual(newStats, savedNewSavedStats, 'Should fetch new overwritten stats');
        });

      fb.getStats('na')
        .then((noStats) => {
          assert.deepEqual(noStats, {}, 'Should get empty object when there is no stats');
        });
    });
});

test('Storage/Firebase: Store/Retrieve History', (assert) => {
  assert.plan(5);
  const game = 'unit-test-2';
  const play = {
    foo: 'bar'
  };

  const fb = new Firebase(config);
  fb.deleteGame(game)
    .then(() => {
      fb.addPlay(game, play)
        .then((res) => {
          assert.ok(res, 'Should save play');
          return fb.getHistory(game);
        })
        .then((gottenHistory) => {
          assert.deepEqual([play], gottenHistory, 'Should fetch history');
          return fb.addPlay(game, play);
        })
        .then((res) => {
          assert.ok(res, 'Should save play');
          return fb.getHistory(game);
        })
        .then((gottenHistory) => {
          assert.deepEqual([play, play], gottenHistory, 'Should fetch new history');
        });

      fb.getHistory('na')
        .then((noHistory) => {
          assert.deepEqual(noHistory, [], 'Should get empty array when there is no history');
        });
    });
});

test('Storage/Firebase: Close Server', (assert) => {
  assert.plan(1);
  server.close((err) => {
    assert.notOk(err, 'Server closes');
    server = null;
  });
});

// https://stackoverflow.com/questions/27641764/how-to-destroy-firebase-ref-in-node
test.onFinish(() => process.exit()); // kill firebase...
