const express = require('express');
const { body, query } = require('express-validator');
const documentController = require('../controllers/DocumentController');

const router = express.Router();

router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('type').optional().isIn(['docx', 'sheet', 'bitable']).withMessage('Invalid document type'),
], documentController.createDocument);

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('PageSize must be between 1 and 100'),
], documentController.listDocuments);

router.get('/:id', documentController.getDocument);

router.get('/:id/content', documentController.getDocumentContent);

router.put('/:id', [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
], documentController.updateDocument);

router.delete('/:id', documentController.deleteDocument);

router.post('/:id/copy', [
  body('newTitle').notEmpty().withMessage('New title is required'),
], documentController.copyDocument);

router.post('/:id/move', [
  body('targetFolderId').optional().isInt().withMessage('Target folder ID must be an integer'),
], documentController.moveDocument);

router.post('/sync', [
  body('feishuFileToken').notEmpty().withMessage('Feishu file token is required'),
], documentController.syncDocument);

module.exports = router;
