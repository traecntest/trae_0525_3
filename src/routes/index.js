const express = require('express');
const documentsRouter = require('./documents');
const foldersRouter = require('./folders');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Feishu Docs Manager API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/documents', documentsRouter);
router.use('/folders', foldersRouter);

module.exports = router;
