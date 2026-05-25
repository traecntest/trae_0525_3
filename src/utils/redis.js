const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.config = config.redis;
  }

  async connect() {
    if (this.client && this.client.isReady) {
      return this.client;
    }

    const options = {
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      database: this.config.db,
    };

    if (this.config.password) {
      options.password = this.config.password;
    }

    this.client = redis.createClient(options);

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await this.client.connect();
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  getKey(key) {
    return this.config.keyPrefix + key;
  }

  async get(key) {
    const client = await this.connect();
    const value = await client.get(this.getKey(key));
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttl = null) {
    const client = await this.connect();
    const redisKey = this.getKey(key);
    
    if (ttl) {
      await client.setEx(redisKey, ttl, JSON.stringify(value));
    } else {
      await client.set(redisKey, JSON.stringify(value));
    }
  }

  async del(key) {
    const client = await this.connect();
    return await client.del(this.getKey(key));
  }

  async exists(key) {
    const client = await this.connect();
    const result = await client.exists(this.getKey(key));
    return result === 1;
  }

  async expire(key, ttl) {
    const client = await this.connect();
    return await client.expire(this.getKey(key), ttl);
  }

  async ttl(key) {
    const client = await this.connect();
    return await client.ttl(this.getKey(key));
  }

  async setNX(key, value, ttl) {
    const client = await this.connect();
    const redisKey = this.getKey(key);
    const result = await client.set(redisKey, JSON.stringify(value), {
      NX: true,
      EX: ttl,
    });
    return result === 'OK';
  }

  getRawClient() {
    return this.client;
  }
}

module.exports = new RedisClient();
