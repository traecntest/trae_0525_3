const express = require('express');
const { body, query } = require('express-validator');
const folderController = require('../controllers/FolderController');

const router = express.Router();

router.post('/', [
  body('name').notEmpty().withMessage('Folder name is required'),
  body('parentId').optional().isInt().withMessage('Parent ID must be an integer'),
], folderController.createFolder);

router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('PageSize must be between 1 and 100'),
], folderController.listFolders);

router.get('/root', folderController.getFolderChildren);

router.get('/:id', folderController.getFolder);

router.get('/:id/children', folderController.getFolderChildren);

router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Folder name cannot be empty'),
  body('sortOrder').optional().isInt().withMessage('Sort order must be an integer'),
], folderController.updateFolder);

router.delete('/:id', folderController.deleteFolder);

router.post('/:id/move', [
  body('newParentId').optional().isInt().withMessage('New parent ID must be an integer'),
], folderController.moveFolder);

module.exports = router;
