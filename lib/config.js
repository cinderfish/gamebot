'use strict';

/**
 * Parse a boolean from a string
 *
 * @param  {string} string A string to parse into a boolean
 * @return {mixed}         Either a boolean or the original value
 */
function parseBool(string) {
  if (typeof string === 'string') {
    return /^(true|1)$/i.test(string);
  }

  return string;
}

/**
 * Parse an object from a string
 *
 * @param  {string} string A string to parse into a boolean
 * @return {mixed}         Either an object or the original value
 */
function parseObject(string) {
  let retVal = string;

  if (typeof string === 'string') {
    try {
      retVal = JSON.parse(string);
      if (typeof retVal !== 'object') {
        throw new Error('Not an object');
      }
    } catch (err) {
      retVal = string; // not an object
    }
  }

  return retVal;
}

/**
 * Parses and enhances config object
 *
 * @param  {object} cfg the raw object from file
 * @return {object}     the paresed config object
 * @throws Error if it cannot parse object
 */
function parse(cfg) {
  if (typeof cfg !== 'object') {
    throw new Error('Config is not an object');
  }

  const config = cfg;

  /**
   * Pull config from ENV if set
   */
  if (process.env.SLACK_TOKEN) {
    config.slack.token = process.env.SLACK_TOKEN;
  }

  if (process.env.SLACK_AUTO_RECONNECT) {
    config.slack.autoReconnect = parseBool(process.env.SLACK_AUTO_RECONNECT);
  }

  if (process.env.STORAGE_TYPE) {
    config.storage.type = process.env.STORAGE_TYPE;
  }

  if (process.env.STORAGE_CONFIG) {
    config.storage.config = parseObject(process.env.STORAGE_CONFIG);
  }

  return config;
}

module.exports = {
  parse,
  parseBool,
  parseObject,
};
