const documentService = require('../services/SimpleDocumentService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class SimpleDocumentController {
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
      res.json({
        success: true,
        data: {
          content: 'Document content would be here in a real implementation',
        },
      });
    } catch (error) {
      logger.error('Get document content error:', error);
      next(error);
    }
  }

  async downloadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }
      
      // 生成模拟的文档内容
      const content = `
${document.title}
===================================

文档ID: ${document.id}
文档类型: ${document.type}
创建时间: ${new Date(document.createdAt).toLocaleString('zh-CN')}
更新时间: ${new Date(document.updatedAt).toLocaleString('zh-CN')}
查看次数: ${document.viewCount || 0}

这是一个示例文档内容。
在实际应用中，这里会包含真实的文档内容。
`.trim();
      
      // 设置响应头
      const filename = `${encodeURIComponent(document.title)}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // 发送内容
      res.send(content);
      
      logger.info(`Document ${id} downloaded: ${document.title}`);
    } catch (error) {
      logger.error('Download document error:', error);
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
      
      res.json(result.documents);
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
}

module.exports = new SimpleDocumentController();
