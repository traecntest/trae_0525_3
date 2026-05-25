const { Op } = require('sequelize');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const User = require('../models/User');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/error');
const crypto = require('crypto');

class SimpleDocumentService {
  constructor() {
    this.cachePrefix = 'document:';
    this.cacheTTL = 3600;
  }

  generateToken() {
    return 'doc_' + crypto.randomBytes(16).toString('hex');
  }

  async createDocument(userId, folderId, title, type = 'docx') {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const document = await Document.create({
      feishuFileToken: this.generateToken(),
      feishuDocToken: this.generateToken(),
      title: title,
      type: type,
      folderId: folderId,
      ownerId: userId,
      feishuOwnerId: user.feishuOpenId,
      feishuCreateTime: new Date(),
      feishuModifyTime: new Date(),
      syncedAt: new Date(),
    });

    logger.info(`Document created: ${document.id} - ${document.title}`);
    return document;
  }

  async getDocumentById(documentId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await document.increment('viewCount');
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

  async copyDocument(documentId, newTitle, targetFolderId = null) {
    const sourceDoc = await Document.findByPk(documentId);
    if (!sourceDoc) {
      throw new NotFoundError('Source document not found');
    }

    const newDoc = await Document.create({
      feishuFileToken: this.generateToken(),
      feishuDocToken: this.generateToken(),
      title: newTitle,
      type: sourceDoc.type,
      folderId: targetFolderId,
      ownerId: sourceDoc.ownerId,
      feishuOwnerId: sourceDoc.feishuOwnerId,
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

    await document.update({ folderId: targetFolderId });
    await redis.del(`${this.cachePrefix}${documentId}`);

    logger.info(`Document moved: ${documentId} -> ${targetFolderId || 'root'}`);
    return document;
  }
}

module.exports = new SimpleDocumentService();
