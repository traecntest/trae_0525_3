const { Op } = require('sequelize');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const User = require('../models/User');
const feishuClient = require('./FeishuClient');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/error');

class FolderService {
  constructor() {
    this.cachePrefix = 'folder:';
    this.cacheTTL = 3600;
  }

  async createFolder(userId, parentId, name) {
    let parentFolder = null;
    let feishuParentToken = null;

    if (parentId) {
      parentFolder = await Folder.findByPk(parentId);
      if (!parentFolder) {
        throw new NotFoundError('Parent folder not found');
      }
      feishuParentToken = parentFolder.feishuFolderToken;
    } else {
      const rootMeta = await feishuClient.getRootFolderMeta();
      feishuParentToken = rootMeta.token;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const result = await feishuClient.createFolder(feishuParentToken, name);
    
    const path = parentFolder 
      ? `${parentFolder.path || ''}/${parentFolder.id}` 
      : '';

    const folder = await Folder.create({
      feishuFolderToken: result.token,
      name,
      parentId,
      ownerId: userId,
      feishuOwnerId: user.feishuOpenId,
      path,
      syncedAt: new Date(),
    });

    logger.info(`Folder created: ${folder.id} - ${folder.name}`);
    return folder;
  }

  async getFolderById(folderId) {
    const cacheKey = `${this.cachePrefix}${folderId}`;
    
    let folder = await redis.get(cacheKey);
    if (!folder) {
      folder = await Folder.findByPk(folderId, {
        include: [
          { model: Folder, as: 'parent' },
          { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        ],
      });
      
      if (folder) {
        await redis.set(cacheKey, folder.toJSON(), this.cacheTTL);
      }
    } else {
      folder = await Folder.findByPk(folderId, {
        include: [
          { model: Folder, as: 'parent' },
          { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        ],
      });
    }

    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    return folder;
  }

  async getFolderChildren(folderId, options = {}) {
    const { includeDocuments = true, page = 1, pageSize = 50 } = options;
    
    let feishuFolderToken;
    
    if (folderId) {
      const folder = await Folder.findByPk(folderId);
      if (!folder) {
        throw new NotFoundError('Folder not found');
      }
      feishuFolderToken = folder.feishuFolderToken;
    } else {
      const rootMeta = await feishuClient.getRootFolderMeta();
      feishuFolderToken = rootMeta.token;
    }

    const folders = await Folder.findAll({
      where: {
        parentId: folderId || null,
        status: 1,
      },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    let documents = [];
    if (includeDocuments) {
      documents = await Document.findAll({
        where: {
          folderId: folderId || null,
          status: 1,
        },
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        ],
        order: [['updatedAt', 'DESC']],
      });
    }

    return {
      folders,
      documents,
    };
  }

  async updateFolder(folderId, updates) {
    const folder = await Folder.findByPk(folderId);
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    const allowedUpdates = ['name', 'sortOrder'];
    const updateData = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await folder.update(updateData);
      await redis.del(`${this.cachePrefix}${folderId}`);
    }

    logger.info(`Folder updated: ${folderId}`);
    return folder;
  }

  async deleteFolder(folderId) {
    const folder = await Folder.findByPk(folderId);
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    const children = await Folder.count({
      where: { parentId: folderId, status: 1 },
    });
    
    const docs = await Document.count({
      where: { folderId, status: 1 },
    });

    if (children > 0 || docs > 0) {
      throw new ValidationError('Cannot delete non-empty folder');
    }

    await folder.update({ status: 0 });
    await redis.del(`${this.cachePrefix}${folderId}`);

    logger.info(`Folder deleted: ${folderId}`);
    return { success: true };
  }

  async moveFolder(folderId, newParentId) {
    const folder = await Folder.findByPk(folderId);
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    if (newParentId) {
      const newParent = await Folder.findByPk(newParentId);
      if (!newParent) {
        throw new NotFoundError('New parent folder not found');
      }
      
      if (newParent.path && newParent.path.includes(`/${folderId}/`)) {
        throw new ValidationError('Cannot move folder to its own descendant');
      }
    }

    const newPath = newParentId
      ? (await Folder.findByPk(newParentId)).path
      : '';

    await folder.update({
      parentId: newParentId,
      path: newPath,
    });

    await redis.del(`${this.cachePrefix}${folderId}`);
    logger.info(`Folder moved: ${folderId} -> ${newParentId || 'root'}`);

    return folder;
  }

  async listFolders(filters = {}, options = {}) {
    const where = { status: 1 };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.ownerId !== undefined) {
      where.ownerId = filters.ownerId;
    }

    if (filters.search) {
      where.name = { [Op.like]: `%${filters.search}%` };
    }

    const { page = 1, pageSize = 20, orderBy = 'name', orderDir = 'ASC' } = options;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Folder.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
      ],
      order: [[orderBy, orderDir]],
      limit: pageSize,
      offset,
    });

    return {
      folders: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }
}

module.exports = new FolderService();
