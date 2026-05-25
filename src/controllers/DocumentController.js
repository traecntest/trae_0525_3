const documentService = require('../services/DocumentService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class DocumentController {
  async createDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { folderId, title, type } = req.body;
      const userId = req.user?.id || 1;

      const document = await documentService.createDocument(userId, folderId, title, type);
      
      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Create document error:', error);
      next(error);
    }
  }

  async getDocument(req, res, next) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);
      
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Get document error:', error);
      next(error);
    }
  }

  async getDocumentContent(req, res, next) {
    try {
      const { id } = req.params;
      const content = await documentService.getDocumentContent(id);
      
      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      logger.error('Get document content error:', error);
      next(error);
    }
  }

  async updateDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;
      
      const document = await documentService.updateDocument(id, updates);
      
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Update document error:', error);
      next(error);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id);
      
      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      logger.error('Delete document error:', error);
      next(error);
    }
  }

  async listDocuments(req, res, next) {
    try {
      const { folderId, ownerId, type, search, page, pageSize, orderBy, orderDir } = req.query;
      
      const result = await documentService.listDocuments(
        { folderId, ownerId, type, search },
        { page, pageSize, orderBy, orderDir }
      );
      
      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('List documents error:', error);
      next(error);
    }
  }

  async copyDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { newTitle, targetFolderId } = req.body;
      
      const document = await documentService.copyDocument(id, newTitle, targetFolderId);
      
      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Copy document error:', error);
      next(error);
    }
  }

  async moveDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { targetFolderId } = req.body;
      
      const document = await documentService.moveDocument(id, targetFolderId);
      
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Move document error:', error);
      next(error);
    }
  }

  async syncDocument(req, res, next) {
    try {
      const { feishuFileToken } = req.body;
      const userId = req.user?.id || 1;
      
      const document = await documentService.syncDocumentFromFeishu(feishuFileToken, userId);
      
      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Sync document error:', error);
      next(error);
    }
  }
}

module.exports = new DocumentController();
