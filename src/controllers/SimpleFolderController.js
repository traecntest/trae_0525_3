const folderService = require('../services/SimpleFolderService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class SimpleFolderController {
  async createFolder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, parentId } = req.body;
      const userId = req.user?.id || 1;

      const folder = await folderService.createFolder(userId, name, parentId);
      
      res.status(201).json({
        success: true,
        data: folder,
      });
    } catch (error) {
      logger.error('Create folder error:', error);
      next(error);
    }
  }

  async getFolder(req, res, next) {
    try {
      const { id } = req.params;
      const folder = await folderService.getFolderById(id);
      
      res.json({
        success: true,
        data: folder,
      });
    } catch (error) {
      logger.error('Get folder error:', error);
      next(error);
    }
  }

  async getFolderChildren(req, res, next) {
    try {
      const { id } = req.params;
      const children = await folderService.getFolderChildren(id ? parseInt(id) : null);
      
      res.json({
        success: true,
        data: children,
      });
    } catch (error) {
      logger.error('Get folder children error:', error);
      next(error);
    }
  }

  async updateFolder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;
      
      const folder = await folderService.updateFolder(id, updates);
      
      res.json({
        success: true,
        data: folder,
      });
    } catch (error) {
      logger.error('Update folder error:', error);
      next(error);
    }
  }

  async deleteFolder(req, res, next) {
    try {
      const { id } = req.params;
      await folderService.deleteFolder(id);
      
      res.json({
        success: true,
        message: 'Folder deleted successfully',
      });
    } catch (error) {
      logger.error('Delete folder error:', error);
      next(error);
    }
  }

  async listFolders(req, res, next) {
    try {
      const { parentId, ownerId, search, page, pageSize, orderBy, orderDir } = req.query;
      
      const result = await folderService.listFolders(
        { parentId, ownerId, search },
        { page, pageSize, orderBy, orderDir }
      );
      
      res.json(result.folders);
    } catch (error) {
      logger.error('List folders error:', error);
      next(error);
    }
  }

  async moveFolder(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { newParentId } = req.body;
      
      const folder = await folderService.moveFolder(id, newParentId);
      
      res.json({
        success: true,
        data: folder,
      });
    } catch (error) {
      logger.error('Move folder error:', error);
      next(error);
    }
  }
}

module.exports = new SimpleFolderController();
