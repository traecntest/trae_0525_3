const redis = require('./redis');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

class DistributedLock {
  constructor() {
    this.lockHolders = new Map();
    this.watchdogTimers = new Map();
  }

  async acquire(lockKey, ttl = 30000, retryCount = 3, retryDelay = 100) {
    const key = `lock:${lockKey}`;
    const value = uuidv4();

    for (let i = 0; i < retryCount; i++) {
      const success = await redis.setNX(key, value, ttl / 1000);
      
      if (success) {
        this.lockHolders.set(key, value);
        this.startWatchdog(key, value, ttl);
        logger.debug(`Lock acquired: ${key}`);
        return {
          key,
          value,
          release: () => this.release(key, value),
        };
      }

      if (i < retryCount - 1) {
        await this.sleep(retryDelay * (i + 1));
      }
    }

    logger.warn(`Failed to acquire lock: ${key}`);
    throw new Error(`Failed to acquire lock: ${lockKey}`);
  }

  async release(key, value) {
    const heldValue = this.lockHolders.get(key);
    
    if (heldValue !== value) {
      logger.warn(`Lock release failed: not the holder ${key}`);
      return false;
    }

    this.stopWatchdog(key);
    this.lockHolders.delete(key);
    
    const currentValue = await redis.get(key.replace('lock:', ''));
    
    if (currentValue === value) {
      await redis.del(key.replace('lock:', ''));
      logger.debug(`Lock released: ${key}`);
      return true;
    }

    logger.warn(`Lock already expired: ${key}`);
    return false;
  }

  startWatchdog(key, value, ttl) {
    const halfTtl = ttl / 2;
    
    const timer = setInterval(async () => {
      const currentValue = await redis.get(key.replace('lock:', ''));
      
      if (currentValue === value) {
        await redis.expire(key.replace('lock:', ''), ttl / 1000);
        logger.debug(`Lock renewed: ${key}`);
      } else {
        this.stopWatchdog(key);
        this.lockHolders.delete(key);
      }
    }, halfTtl);

    this.watchdogTimers.set(key, timer);
  }

  stopWatchdog(key) {
    const timer = this.watchdogTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.watchdogTimers.delete(key);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DistributedLock();
