const { Op } = require('sequelize');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const User = require('../models/User');
const feishuClient = require('./FeishuClient');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/error');
const crypto = require('crypto');

class DocumentService {
  constructor() {
    this.cachePrefix = 'document:';
    this.cacheTTL = 3600;
  }

  async createDocument(userId, folderId, title, type = 'docx') {
    let folder = null;
    let feishuFolderToken = null;

    if (folderId) {
      folder = await Folder.findByPk(folderId);
      if (!folder) {
        throw new NotFoundError('Folder not found');
      }
      feishuFolderToken = folder.feishuFolderToken;
    } else {
      const rootMeta = await feishuClient.getRootFolderMeta();
      feishuFolderToken = rootMeta.token;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const result = await feishuClient.createDocument(feishuFolderToken, title);
    
    const document = await Document.create({
      feishuFileToken: result.file_token,
      feishuDocToken: result.doc_token,
      title: title,
      type: type,
      folderId: folderId,
      ownerId: userId,
      feishuOwnerId: user.feishuOpenId,
      feishuCreateTime: new Date(result.created_time * 1000),
      feishuModifyTime: new Date(result.modified_time * 1000),
      syncedAt: new Date(),
    });

    logger.info(`Document created: ${document.id} - ${document.title}`);
    return document;
  }

  async getDocumentById(documentId) {
    const cacheKey = `${this.cachePrefix}${documentId}`;
    
    let document = await redis.get(cacheKey);
    if (document) {
      document = await Document.findByPk(documentId, {
        include: [
          { model: Folder, as: 'folder' },
          { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        ],
      });
    } else {
      document = await Document.findByPk(documentId, {
        include: [
          { model: Folder, as: 'folder' },
          { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        ],
      });
      
      if (document) {
        await redis.set(cacheKey, document.toJSON(), this.cacheTTL);
      }
    }

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await document.increment('viewCount');
    return document;
  }

  async getDocumentByFeishuToken(feishuFileToken) {
    const document = await Document.findOne({
      where: { feishuFileToken },
      include: [
        { model: Folder, as: 'folder' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
      ],
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return document;
  }

  async updateDocument(documentId, updates) {
    const document = await Document.findByPk(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const allowedUpdates = ['title', 'tags', 'description'];
    const updateData = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await document.update(updateData);
      await redis.del(`${this.cachePrefix}${documentId}`);
    }

    logger.info(`Document updated: ${documentId}`);
    return document;
  }

  async deleteDocument(documentId) {
    const document = await Document.findByPk(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await feishuClient.deleteFile(document.feishuFileToken);
    await document.update({ status: 0 });
    await redis.del(`${this.cachePrefix}${documentId}`);

    logger.info(`Document deleted: ${documentId}`);
    return { success: true };
  }

  async listDocuments(filters = {}, options = {}) {
    const where = {
      status: 1,
    };

    if (filters.folderId !== undefined) {
      where.folderId = filters.folderId;
    }

    if (filters.ownerId !== undefined) {
      where.ownerId = filters.ownerId;
    }

    if (filters.type !== undefined) {
      where.type = filters.type;
    }

    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const { page = 1, pageSize = 20, orderBy = 'updated_at', orderDir = 'DESC' } = options;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        { model: Folder, as: 'folder' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
      ],
      order: [[orderBy, orderDir]],
      limit: pageSize,
      offset,
    });

    return {
      documents: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  async getDocumentContent(documentId) {
    const document = await this.getDocumentById(documentId);
    if (!document.feishuDocToken) {
      throw new ValidationError('Document does not support content operations');
    }

    const blocks = await feishuClient.getDocumentBlocks(document.feishuDocToken);
    return blocks;
  }

  async syncDocumentFromFeishu(feishuFileToken, userId) {
    const files = await feishuClient.batchGetFiles([feishuFileToken]);
    if (!files.list || files.list.length === 0) {
      throw new NotFoundError('File not found in Feishu');
    }

    const feishuFile = files.list[0];
    
    const existingDoc = await Document.findOne({
      where: { feishuFileToken },
    });

    const user = await User.findByPk(userId);

    const documentData = {
      feishuFileToken: feishuFile.token,
      feishuDocToken: feishuFile.doc_token,
      title: feishuFile.name,
      type: feishuFile.type,
      ownerId: userId,
      feishuOwnerId: user?.feishuOpenId,
      feishuCreateTime: feishuFile.created_time ? new Date(feishuFile.created_time * 1000) : null,
      feishuModifyTime: feishuFile.modified_time ? new Date(feishuFile.modified_time * 1000) : null,
      syncedAt: new Date(),
    };

    let document;
    if (existingDoc) {
      document = await existingDoc.update(documentData);
      logger.info(`Document synced (update): ${feishuFileToken}`);
    } else {
      document = await Document.create(documentData);
      logger.info(`Document synced (create): ${feishuFileToken}`);
    }

    await redis.del(`${this.cachePrefix}${document.id}`);
    return document;
  }

  async copyDocument(documentId, newTitle, targetFolderId = null) {
    const sourceDoc = await Document.findByPk(documentId);
    if (!sourceDoc) {
      throw new NotFoundError('Source document not found');
    }

    let targetFolderToken = null;
    if (targetFolderId) {
      const targetFolder = await Folder.findByPk(targetFolderId);
      if (!targetFolder) {
        throw new NotFoundError('Target folder not found');
      }
      targetFolderToken = targetFolder.feishuFolderToken;
    } else {
      const rootMeta = await feishuClient.getRootFolderMeta();
      targetFolderToken = rootMeta.token;
    }

    const copied = await feishuClient.copyFile(
      sourceDoc.feishuFileToken,
      newTitle,
      targetFolderToken
    );

    const newDoc = await Document.create({
      feishuFileToken: copied.file_token,
      feishuDocToken: copied.doc_token,
      title: newTitle,
      type: sourceDoc.type,
      folderId: targetFolderId,
      ownerId: sourceDoc.ownerId,
      feishuOwnerId: sourceDoc.feishuOwnerId,
      feishuCreateTime: new Date(copied.created_time * 1000),
      feishuModifyTime: new Date(copied.modified_time * 1000),
      tags: sourceDoc.tags,
      description: sourceDoc.description,
      syncedAt: new Date(),
    });

    logger.info(`Document copied: ${sourceDoc.id} -> ${newDoc.id}`);
    return newDoc;
  }

  async moveDocument(documentId, targetFolderId) {
    const document = await Document.findByPk(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    let targetFolderToken = null;
    if (targetFolderId) {
      const targetFolder = await Folder.findByPk(targetFolderId);
      if (!targetFolder) {
        throw new NotFoundError('Target folder not found');
      }
      targetFolderToken = targetFolder.feishuFolderToken;
    } else {
      const rootMeta = await feishuClient.getRootFolderMeta();
      targetFolderToken = rootMeta.token;
    }

    await feishuClient.moveFile(document.feishuFileToken, targetFolderToken);
    await document.update({ folderId: targetFolderId });
    await redis.del(`${this.cachePrefix}${documentId}`);

    logger.info(`Document moved: ${documentId} -> ${targetFolderId || 'root'}`);
    return document;
  }
}

module.exports = new DocumentService();
