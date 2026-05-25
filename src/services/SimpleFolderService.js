const { Op } = require('sequelize');
const Folder = require('../models/Folder');
const User = require('../models/User');
const Document = require('../models/Document');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/error');
const crypto = require('crypto');

class SimpleFolderService {
  constructor() {
    this.cachePrefix = 'folder:';
    this.cacheTTL = 3600;
  }

  generateToken() {
    return 'folder_' + crypto.randomBytes(16).toString('hex');
  }

  async createFolder(userId, name, parentId = null) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let path = name;
    if (parentId) {
      const parentFolder = await Folder.findByPk(parentId);
      if (!parentFolder) {
        throw new NotFoundError('Parent folder not found');
      }
      path = `${parentFolder.path}/${name}`;
    }

    const folder = await Folder.create({
      feishuFolderToken: this.generateToken(),
      name,
      parentId,
      ownerId: userId,
      feishuOwnerId: user.feishuOpenId,
      path,
      sortOrder: 0,
      status: 1,
      syncedAt: new Date(),
    });

    logger.info(`Folder created: ${folder.id} - ${folder.name}`);
    return folder;
  }

  async getFolderById(folderId) {
    const folder = await Folder.findByPk(folderId);

    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    return folder;
  }

  async getFolderChildren(folderId = null) {
    const where = {
      status: 1,
      parentId: folderId,
    };

    const folders = await Folder.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    const documents = await Document.findAll({
      where: {
        status: 1,
        folderId,
      },
      order: [['updated_at', 'DESC']],
    });

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

    const childCount = await Folder.count({
      where: {
        parentId: folderId,
        status: 1,
      },
    });

    if (childCount > 0) {
      throw new Error('Cannot delete folder with children');
    }

    await folder.update({ status: 0 });
    await redis.del(`${this.cachePrefix}${folderId}`);

    logger.info(`Folder deleted: ${folderId}`);
    return { success: true };
  }

  async listFolders(filters = {}, options = {}) {
    const where = {
      status: 1,
    };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.ownerId !== undefined) {
      where.ownerId = filters.ownerId;
    }

    if (filters.search) {
      where.name = { [Op.like]: `%${filters.search}%` };
    }

    const { page = 1, pageSize = 20, orderBy = 'sortOrder', orderDir = 'ASC' } = options;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Folder.findAndCountAll({
      where,
      order: [[orderBy, orderDir], ['name', 'ASC']],
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
    }

    await folder.update({ parentId: newParentId });
    await redis.del(`${this.cachePrefix}${folderId}`);

    logger.info(`Folder moved: ${folderId} -> ${newParentId || 'root'}`);
    return folder;
  }
}

module.exports = new SimpleFolderService();
