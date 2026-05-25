const User = require('./models/User');
const Folder = require('./models/Folder');
const Document = require('./models/Document');
const logger = require('./utils/logger');
const crypto = require('crypto');

async function initData() {
  try {
    const existingUser = await User.findByPk(1);
    if (!existingUser) {
      await User.create({
        id: 1,
        feishuOpenId: 'user_' + crypto.randomBytes(8).toString('hex'),
        name: 'Demo User',
        email: 'demo@example.com',
        avatarUrl: null,
        status: 1,
      });
      logger.info('Demo user created');
    }

    const rootFolder = await Folder.findOne({ where: { parentId: null } });
    if (!rootFolder) {
      await Folder.create({
        feishuFolderToken: 'folder_root_' + crypto.randomBytes(8).toString('hex'),
        name: 'Root Folder',
        parentId: null,
        ownerId: 1,
        path: 'Root Folder',
        sortOrder: 0,
        status: 1,
      });
      logger.info('Root folder created');
    }

    const demoFolder = await Folder.findOne({ where: { name: 'Demo Documents' } });
    if (!demoFolder) {
      await Folder.create({
        feishuFolderToken: 'folder_demo_' + crypto.randomBytes(8).toString('hex'),
        name: 'Demo Documents',
        parentId: null,
        ownerId: 1,
        path: 'Demo Documents',
        sortOrder: 1,
        status: 1,
      });
      logger.info('Demo folder created');
    }

    const demoDoc = await Document.findOne({ where: { title: 'Welcome to Feishu Docs Manager' } });
    if (!demoDoc) {
      await Document.create({
        feishuFileToken: 'doc_welcome_' + crypto.randomBytes(8).toString('hex'),
        feishuDocToken: 'doc_welcome_' + crypto.randomBytes(8).toString('hex'),
        title: 'Welcome to Feishu Docs Manager',
        type: 'docx',
        folderId: null,
        ownerId: 1,
        feishuOwnerId: null,
        feishuCreateTime: new Date(),
        feishuModifyTime: new Date(),
        version: 1,
        tags: ['demo', 'welcome'],
        description: 'This is a demo document to get you started',
        viewCount: 0,
        status: 1,
        syncedAt: new Date(),
      });
      logger.info('Demo document created');
    }

    logger.info('Initialization complete');
  } catch (error) {
    logger.error('Init data error:', error);
  }
}

module.exports = { initData };
