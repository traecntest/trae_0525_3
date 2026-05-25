const express = require('express');
const { sequelize } = require('../config/database');
const redis = require('../utils/redis');
const documentsRouter = require('./documents');
const foldersRouter = require('./folders');

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    success: true,
    message: 'Feishu Docs Manager API is running',
    timestamp: new Date().toISOString(),
    database: false,
    redis: false,
    feishu: true, // 假设飞书API总是可用的
  };

  try {
    await sequelize.authenticate();
    health.database = true;
  } catch (error) {
    health.database = false;
  }

  try {
    await redis.ping();
    health.redis = true;
  } catch (error) {
    health.redis = false;
  }

  res.json(health);
});

router.use('/documents', documentsRouter);
router.use('/folders', foldersRouter);

module.exports = router;
