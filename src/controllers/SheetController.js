const sheetService = require('../services/SimpleSheetService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class SheetController {
  async createSpreadsheet(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, folderToken } = req.body;
      const spreadsheet = await sheetService.createSpreadsheet(title, folderToken);
      
      res.status(201).json({
        success: true,
        data: spreadsheet,
      });
    } catch (error) {
      logger.error('Create spreadsheet error:', error);
      next(error);
    }
  }

  async listSpreadsheets(req, res, next) {
    try {
      const spreadsheets = await sheetService.listSpreadsheets();
      
      res.json({
        success: true,
        data: spreadsheets,
      });
    } catch (error) {
      logger.error('List spreadsheets error:', error);
      next(error);
    }
  }

  async getSpreadsheet(req, res, next) {
    try {
      const { spreadsheetToken } = req.params;
      const spreadsheet = await sheetService.getSpreadsheet(spreadsheetToken);
      
      res.json({
        success: true,
        data: spreadsheet,
      });
    } catch (error) {
      logger.error('Get spreadsheet error:', error);
      next(error);
    }
  }

  async deleteSpreadsheet(req, res, next) {
    try {
      const { spreadsheetToken } = req.params;
      await sheetService.deleteSpreadsheet(spreadsheetToken);
      
      res.json({
        success: true,
        message: 'Spreadsheet deleted successfully',
      });
    } catch (error) {
      logger.error('Delete spreadsheet error:', error);
      next(error);
    }
  }

  async getSheets(req, res, next) {
    try {
      const { spreadsheetToken } = req.params;
      const sheets = await sheetService.getSheets(spreadsheetToken);
      
      res.json({
        success: true,
        data: sheets,
      });
    } catch (error) {
      logger.error('Get sheets error:', error);
      next(error);
    }
  }

  async getSheetMetainfo(req, res, next) {
    try {
      const { spreadsheetToken } = req.params;
      const metainfo = await sheetService.getSheetMetainfo(spreadsheetToken);
      
      res.json({
        success: true,
        data: metainfo,
      });
    } catch (error) {
      logger.error('Get sheet metainfo error:', error);
      next(error);
    }
  }

  async addSheet(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spreadsheetToken } = req.params;
      const { title } = req.body;
      const sheet = await sheetService.addSheet(spreadsheetToken, title);
      
      res.status(201).json({
        success: true,
        data: sheet,
      });
    } catch (error) {
      logger.error('Add sheet error:', error);
      next(error);
    }
  }

  async deleteSheet(req, res, next) {
    try {
      const { spreadsheetToken, sheetId } = req.params;
      await sheetService.deleteSheet(spreadsheetToken, sheetId);
      
      res.json({
        success: true,
        message: 'Sheet deleted successfully',
      });
    } catch (error) {
      logger.error('Delete sheet error:', error);
      next(error);
    }
  }

  async updateSheetProperties(req, res, next) {
    try {
      const { spreadsheetToken, sheetId } = req.params;
      const properties = req.body;
      const sheet = await sheetService.updateSheetProperties(spreadsheetToken, sheetId, properties);
      
      res.json({
        success: true,
        data: sheet,
      });
    } catch (error) {
      logger.error('Update sheet properties error:', error);
      next(error);
    }
  }

  async readRange(req, res, next) {
    try {
      const { spreadsheetToken } = req.params;
      const { range, valueRenderOption, dateTimeRenderOption } = req.query;
      
      const data = await sheetService.readRange(spreadsheetToken, range, {
        valueRenderOption,
        dateTimeRenderOption,
      });
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      logger.error('Read range error:', error);
      next(error);
    }
  }

  async writeRange(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spreadsheetToken } = req.params;
      const { range, values } = req.body;
      
      const result = await sheetService.writeRange(spreadsheetToken, range, values);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Write range error:', error);
      next(error);
    }
  }

  async insertDimension(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spreadsheetToken, sheetId } = req.params;
      const { dimension, startIndex, endIndex } = req.body;
      
      const result = await sheetService.insertDimension(
        spreadsheetToken,
        sheetId,
        dimension,
        startIndex,
        endIndex
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Insert dimension error:', error);
      next(error);
    }
  }

  async deleteDimension(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spreadsheetToken, sheetId } = req.params;
      const { dimension, startIndex, endIndex } = req.body;
      
      const result = await sheetService.deleteDimension(
        spreadsheetToken,
        sheetId,
        dimension,
        startIndex,
        endIndex
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Delete dimension error:', error);
      next(error);
    }
  }

  async findAndReplace(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { spreadsheetToken, sheetId } = req.params;
      const { find, replacement, matchCase, matchEntireCell, searchByRegex, includeFormulas } = req.body;
      
      const result = await sheetService.findAndReplace(
        spreadsheetToken,
        sheetId,
        find,
        replacement,
        {
          matchCase,
          matchEntireCell,
          searchByRegex,
          includeFormulas,
        }
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Find and replace error:', error);
      next(error);
    }
  }
}

module.exports = new SheetController();
