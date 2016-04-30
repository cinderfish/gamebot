'use strict';

const config = {
  slack: {
    token: 'xoxb-Your-Token',
    autoReconnect: true,
  },
  storage: {
    type: 'Memory', // The type of storage to use
    config: { // config to be sent to your storage of choice

    },
  },
};
module.exports = config;
