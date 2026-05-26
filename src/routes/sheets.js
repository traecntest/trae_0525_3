const express = require('express');
const { body, query } = require('express-validator');
const sheetController = require('../controllers/SheetController');

const router = express.Router();

router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('folderToken').optional(),
], sheetController.createSpreadsheet);

router.get('/', sheetController.listSpreadsheets);

router.get('/:spreadsheetToken', sheetController.getSpreadsheet);

router.delete('/:spreadsheetToken', sheetController.deleteSpreadsheet);

router.get('/:spreadsheetToken/metainfo', sheetController.getSheetMetainfo);

router.get('/:spreadsheetToken/sheets', sheetController.getSheets);

router.post('/:spreadsheetToken/sheets', [
  body('title').notEmpty().withMessage('Title is required'),
], sheetController.addSheet);

router.delete('/:spreadsheetToken/sheets/:sheetId', sheetController.deleteSheet);

router.patch('/:spreadsheetToken/sheets/:sheetId', sheetController.updateSheetProperties);

router.get('/:spreadsheetToken/values', [
  query('range').notEmpty().withMessage('Range is required'),
], sheetController.readRange);

router.put('/:spreadsheetToken/values', [
  body('range').notEmpty().withMessage('Range is required'),
  body('values').isArray().withMessage('Values must be an array'),
], sheetController.writeRange);

router.post('/:spreadsheetToken/sheets/:sheetId/dimensions', [
  body('dimension').isIn(['ROWS', 'COLUMNS']).withMessage('Dimension must be ROWS or COLUMNS'),
  body('startIndex').isInt({ min: 0 }).withMessage('Start index must be a non-negative integer'),
  body('endIndex').isInt({ min: 1 }).withMessage('End index must be a positive integer'),
], sheetController.insertDimension);

router.delete('/:spreadsheetToken/sheets/:sheetId/dimensions', [
  body('dimension').isIn(['ROWS', 'COLUMNS']).withMessage('Dimension must be ROWS or COLUMNS'),
  body('startIndex').isInt({ min: 0 }).withMessage('Start index must be a non-negative integer'),
  body('endIndex').isInt({ min: 1 }).withMessage('End index must be a positive integer'),
], sheetController.deleteDimension);

router.post('/:spreadsheetToken/sheets/:sheetId/replace', [
  body('find').notEmpty().withMessage('Find string is required'),
  body('replacement').notEmpty().withMessage('Replacement string is required'),
], sheetController.findAndReplace);

module.exports = router;
