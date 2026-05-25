const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

let sequelize;

function initSequelize() {
  const dbConfig = {
    dialect: 'mysql',
    dialectOptions: {
      charset: config.database.charset,
    },
    define: {
      charset: config.database.charset,
      collate: 'utf8mb4_unicode_ci',
    },
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+08:00',
  };
  
  if (config.database.socketPath) {
    logger.info(`Using MySQL socket connection: ${config.database.socketPath}`);
    dbConfig.socketPath = config.database.socketPath;
  } else {
    const host = config.database.host || 'localhost';
    const port = config.database.port || 3306;
    logger.info(`Using MySQL TCP connection: ${host}:${port}`);
    dbConfig.host = host;
    dbConfig.port = port;
  }
  
  sequelize = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    dbConfig
  );
}

// 初始化一次
initSequelize();

const connectDB = async () => {
  try {
    if (config.database.socketPath) {
      logger.info(`Connecting to MySQL database via socket...`, {
        socket: config.database.socketPath,
        database: config.database.database,
      });
    } else {
      const host = config.database.host || 'localhost';
      const port = config.database.port || 3306;
      logger.info(`Connecting to MySQL database...`, {
        host: host,
        port: port,
        database: config.database.database,
      });
    }
    
    await sequelize.authenticate();
    logger.info('MySQL database connected successfully');
    
    return sequelize;
  } catch (error) {
    logger.error(`MySQL database connection failed:`, {
      message: error.message,
      host: config.database.socketPath || config.database.host || 'localhost',
      port: config.database.socketPath ? 'socket' : config.database.port || 3306,
      database: config.database.database,
    });
    
    if (error.original) {
      logger.error('Original error:', {
        code: error.original.code,
        errno: error.original.errno,
        message: error.original.message,
      });
    }
    
    throw error;
  }
};

module.exports = { sequelize, connectDB };
