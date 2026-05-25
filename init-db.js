require('dotenv').config();
const { sequelize, connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function initDatabase() {
  try {
    await connectDB();
    
    logger.info('Syncing database models...');
    
    await sequelize.sync({ force: false, alter: true });
    
    logger.info('Database initialized successfully!');
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initDatabase();
