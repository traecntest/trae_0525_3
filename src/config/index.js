require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    tokenKey: process.env.FEISHU_APP_TOKEN_KEY || 'feishu:token:tenant',
    domain: process.env.FEISHU_DOMAIN || 'https://open.feishu.cn',
  },
  
  database: {
    dialect: process.env.DB_DIALECT || 'mysql',
    socketPath: process.env.DB_SOCKET_PATH || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_DATABASE || 'feishu_docs',
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: process.env.DB_CHARSET || 'utf8mb4',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'feishu:docs:',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};
