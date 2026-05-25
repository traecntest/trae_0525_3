require('dotenv').config();
const { connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');

logger.info('='.repeat(60));
logger.info('Testing database connection...');
logger.info('='.repeat(60));

async function testConnection() {
  try {
    await connectDB();
    logger.info('');
    logger.info('✅ Database connection successful!');
    logger.info('');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
