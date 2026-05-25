require('dotenv').config();
const express = require('express');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const redis = require('./utils/redis');
const { initData } = require('./initData');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

app.use(express.static('public'));
app.use('/api', routes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    await redis.connect();
    logger.info('Redis connected successfully');

    await initData();
    logger.info('Demo data initialized');

    const port = config.port || 3000;
    app.listen(port, () => {
      logger.info(`✅ 服务器已启动成功！`);
      logger.info(`🌐 访问地址: http://localhost:${port}`);
      logger.info(`🏥 健康检查: http://localhost:${port}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
