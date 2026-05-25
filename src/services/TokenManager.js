const axios = require('axios');
const config = require('../config');
const redis = require('../utils/redis');
const lock = require('../utils/lock');
const logger = require('../utils/logger');
const { FeishuApiError } = require('../utils/error');

class TokenManager {
  constructor() {
    this.config = config.feishu;
    this.tokenKey = this.config.tokenKey;
    this.tokenRefreshBuffer = 5 * 60;
  }

  async getTenantAccessToken() {
    const cachedToken = await this.getCachedToken();
    
    if (cachedToken && !this.isTokenExpired(cachedToken)) {
      return cachedToken.access_token;
    }

    const lockKey = 'token:refresh';
    
    try {
      const lockHandle = await lock.acquire(lockKey, 30000, 5, 200);
      
      try {
        const doubleCheckToken = await this.getCachedToken();
        if (doubleCheckToken && !this.isTokenExpired(doubleCheckToken)) {
          return doubleCheckToken.access_token;
        }

        const newToken = await this.fetchNewToken();
        await this.cacheToken(newToken);
        
        return newToken.access_token;
      } finally {
        await lockHandle.release();
      }
    } catch (error) {
      logger.error('Failed to get tenant access token:', error);
      throw error;
    }
  }

  async getCachedToken() {
    try {
      const tokenData = await redis.get(this.tokenKey);
      return tokenData;
    } catch (error) {
      logger.error('Failed to get cached token:', error);
      return null;
    }
  }

  async cacheToken(tokenData) {
    try {
      const ttl = tokenData.expire - this.tokenRefreshBuffer;
      await redis.set(this.tokenKey, tokenData, ttl);
      logger.info('Token cached successfully');
    } catch (error) {
      logger.error('Failed to cache token:', error);
    }
  }

  isTokenExpired(tokenData) {
    if (!tokenData || !tokenData.expire) {
      return true;
    }
    const now = Math.floor(Date.now() / 1000);
    return tokenData.expire - now < this.tokenRefreshBuffer;
  }

  async fetchNewToken() {
    logger.info('Fetching new tenant access token from Feishu');
    
    try {
      const response = await axios.post(
        `${this.config.domain}/open-apis/auth/v3/tenant_access_token/internal`,
        {
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      
      if (data.code !== 0) {
        throw new FeishuApiError(
          `Failed to get tenant access token: ${data.msg}`,
          data.code
        );
      }

      const tokenInfo = {
        access_token: data.tenant_access_token,
        expire: Math.floor(Date.now() / 1000) + data.expire,
      };

      logger.info('Successfully fetched new tenant access token');
      return tokenInfo;
    } catch (error) {
      logger.error('Error fetching token:', error);
      throw error;
    }
  }

  async clearTokenCache() {
    try {
      await redis.del(this.tokenKey);
      logger.info('Token cache cleared');
    } catch (error) {
      logger.error('Failed to clear token cache:', error);
    }
  }
}

module.exports = new TokenManager();
