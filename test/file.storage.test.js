'use strict';

const test = require('tape');
const fs = require('fs');
const File = require(`${process.env.PWD}/lib/storage/File`);

const dbConfig = {
  path: `${process.env.PWD}/data/unit.json`
};

test('Storage/File: Sets config', (assert) => {
  const db = new File();
  assert.ok(db.config.path, 'Default Config should be set in new class');

  const configDB = new File(dbConfig);
  assert.deepEqual(configDB.config, dbConfig, 'Config should be set in new class');
  assert.end();
});

test('Storage/File: Store/Retrieve Stats', (assert) => {
  assert.plan(4);
  const game = 'foo';
  const stats = {
    foo: 'bar'
  };
  const newStats = {
    bar: 'foo'
  };

  const db = new File(dbConfig);
  db.setStats(game, stats)
    .then((savedStats) => {
      assert.deepEqual(stats, savedStats, 'Should save stats');
      return db.getStats(game);
    })
    .then((gottenStats) => {
      assert.deepEqual(stats, gottenStats, 'Should fetch stats');
      return db.setStats(game, newStats);
    })
    .then((savedNewSavedStats) => {
      assert.deepEqual(newStats, savedNewSavedStats, 'Should fetch new overwritten stats');
    })
    .catch((err) => {
      assert.fail(err);
    });

  db.getStats('na')
    .then((noStats) => {
      assert.deepEqual(noStats, {}, 'Should get empty object when there is no stats');
    });
});

test('Storage/File: Store/Retrieve History', (assert) => {
  assert.plan(5);
  const game = 'foo';
  const play = {
    foo: 'bar'
  };

  const db = new File(dbConfig);
  db.addPlay(game, play)
    .then((res) => {
      assert.ok(res, 'Should save play');
      return db.getHistory(game);
    })
    .then((gottenHistory) => {
      assert.deepEqual([play], gottenHistory, 'Should fetch history');
      return db.addPlay(game, play);
    })
    .then((res) => {
      assert.ok(res, 'Should save play');
      return db.getHistory(game);
    })
    .then((gottenHistory) => {
      assert.deepEqual([play, play], gottenHistory, 'Should fetch new history');
    })
    .catch((err) => {
      assert.fail(err);
    });

  db.getHistory('na')
    .then((noHistory) => {
      assert.deepEqual(noHistory, [], 'Should get empty array when there is no history');
    })
    .catch((err) => {
      assert.fail(err);
    });
});

test('Storage/File: Delete a game', (assert) => {
  assert.plan(3);
  const game = 'foo';
  const play = {
    foo: 'bar'
  };
  const stats = {
    foo: 'bar'
  };

  const db = new File(dbConfig);
  Promise.all([
    db.addPlay(game, play),
    db.setStats(game, stats)
  ])
    .then(() => db.deleteGame(game))
    .then((res) => {
      assert.ok(res, 'Delete should return truthy value');
      return Promise.all([
        db.getStats(game),
        db.getHistory(game)
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
    })
    .catch((err) => {
      assert.fail(err);
    });
});

// Clean up test file
test.onFinish(() => {
  fs.unlink(dbConfig.path, (err) => {
    if (err) {
      throw err;
    }
  });
});
