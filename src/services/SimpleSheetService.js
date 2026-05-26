const logger = require('../utils/logger');
const crypto = require('crypto');

class SimpleSheetService {
  constructor() {
    this.spreadsheets = new Map();
    this.sheets = new Map();
    this.cells = new Map();
    
    this.initDemoData();
  }

  generateToken(prefix = '') {
    return prefix + crypto.randomBytes(12).toString('hex');
  }

  initDemoData() {
    const demoSheet = this.createSpreadsheetSync('销售数据表', null);
    const demoSheet2 = this.createSpreadsheetSync('项目进度表', null);
    
    const mainSheet = this.sheets.get(`${demoSheet.spreadsheet_token}_main`);
    if (mainSheet) {
      const sampleData = [
        ['产品名称', '销售数量', '单价', '销售额', '日期'],
        ['产品A', '100', '99.9', '9990', '2024-01-15'],
        ['产品B', '250', '49.9', '12475', '2024-01-16'],
        ['产品C', '80', '199.9', '15992', '2024-01-17'],
        ['产品D', '150', '79.9', '11985', '2024-01-18'],
        ['产品E', '200', '59.9', '11980', '2024-01-19'],
      ];
      
      for (let row = 0; row < sampleData.length; row++) {
        for (let col = 0; col < sampleData[row].length; col++) {
          const cellKey = `${mainSheet.sheet_id}!${this.getColumnLetter(col)}${row + 1}`;
          this.cells.set(cellKey, sampleData[row][col]);
        }
      }
    }
  }

  getColumnLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  createSpreadsheetSync(title, folderToken = null) {
    const spreadsheetToken = this.generateToken('sht');
    const sheetId = this.generateToken('sh');
    
    const spreadsheet = {
      title: title,
      spreadsheet_token: spreadsheetToken,
      folder_token: folderToken,
      url: `https://feishu.cn/sheets/${spreadsheetToken}`,
      created_time: Date.now(),
      modified_time: Date.now(),
    };
    
    const sheet = {
      sheet_id: sheetId,
      title: '工作表1',
      index: 0,
      row_count: 100,
      column_count: 26,
    };
    
    this.spreadsheets.set(spreadsheetToken, spreadsheet);
    this.sheets.set(`${spreadsheetToken}_main`, sheet);
    this.sheets.set(`${spreadsheetToken}_${sheetId}`, sheet);
    
    logger.info(`Spreadsheet created: ${title} - ${spreadsheetToken}`);
    return spreadsheet;
  }

  async createSpreadsheet(title, folderToken = null) {
    return this.createSpreadsheetSync(title, folderToken);
  }

  async getSpreadsheet(spreadsheetToken) {
    const spreadsheet = this.spreadsheets.get(spreadsheetToken);
    if (!spreadsheet) {
      throw new Error('Spreadsheet not found');
    }
    return spreadsheet;
  }

  async getSheets(spreadsheetToken) {
    if (!this.spreadsheets.has(spreadsheetToken)) {
      throw new Error('Spreadsheet not found');
    }
    
    const sheets = [];
    for (const [key, sheet] of this.sheets.entries()) {
      if (key.startsWith(`${spreadsheetToken}_`)) {
        sheets.push(sheet);
      }
    }
    return sheets;
  }

  async getSheetMetainfo(spreadsheetToken) {
    if (!this.spreadsheets.has(spreadsheetToken)) {
      throw new Error('Spreadsheet not found');
    }
    
    return {
      spreadsheet: this.spreadsheets.get(spreadsheetToken),
      sheets: await this.getSheets(spreadsheetToken),
    };
  }

  parseRange(range) {
    const [sheetId, cellRange] = range.split('!');
    if (!cellRange) {
      return { sheetId: range, startCell: null, endCell: null };
    }
    
    const [startCell, endCell] = cellRange.split(':');
    return { sheetId, startCell, endCell };
  }

  parseCell(cell) {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { col: 0, row: 0 };
    
    let col = 0;
    for (let i = 0; i < match[1].length; i++) {
      col = col * 26 + (match[1].charCodeAt(i) - 64);
    }
    
    return { col: col - 1, row: parseInt(match[2]) - 1 };
  }

  async readRange(spreadsheetToken, range, options = {}) {
    const { sheetId, startCell, endCell } = this.parseRange(range);
    
    const sheet = this.sheets.get(`${spreadsheetToken}_${sheetId}`);
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    let start, end;
    if (startCell && endCell) {
      start = this.parseCell(startCell);
      end = this.parseCell(endCell);
    } else {
      start = { col: 0, row: 0 };
      end = { col: sheet.column_count - 1, row: sheet.row_count - 1 };
    }
    
    const values = [];
    for (let row = start.row; row <= end.row; row++) {
      const rowData = [];
      let hasData = false;
      
      for (let col = start.col; col <= end.col; col++) {
        const colLetter = this.getColumnLetter(col);
        const cellKey = `${sheetId}!${colLetter}${row + 1}`;
        const value = this.cells.get(cellKey);
        rowData.push(value !== undefined ? value : '');
        if (value !== undefined) hasData = true;
      }
      
      if (hasData || row <= 5) {
        values.push(rowData);
      }
    }
    
    return {
      range: range,
      values: values,
    };
  }

  async writeRange(spreadsheetToken, range, values) {
    const { sheetId } = this.parseRange(range);
    
    const sheet = this.sheets.get(`${spreadsheetToken}_${sheetId}`);
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    let updatedCells = 0;
    
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const colLetter = this.getColumnLetter(col);
        const cellKey = `${sheetId}!${colLetter}${row + 1}`;
        this.cells.set(cellKey, values[row][col]);
        updatedCells++;
      }
    }
    
    logger.info(`Range written: ${range}, cells: ${updatedCells}`);
    
    return {
      spreadsheetToken: spreadsheetToken,
      updatedRange: range,
      updatedRows: values.length,
      updatedColumns: values[0]?.length || 0,
      updatedCells: updatedCells,
      revision: Date.now(),
    };
  }

  async addSheet(spreadsheetToken, title) {
    if (!this.spreadsheets.has(spreadsheetToken)) {
      throw new Error('Spreadsheet not found');
    }
    
    const sheets = await this.getSheets(spreadsheetToken);
    const sheetId = this.generateToken('sh');
    
    const sheet = {
      sheet_id: sheetId,
      title: title,
      index: sheets.length,
      row_count: 100,
      column_count: 26,
    };
    
    this.sheets.set(`${spreadsheetToken}_${sheetId}`, sheet);
    
    logger.info(`Sheet added: ${title} - ${sheetId}`);
    return sheet;
  }

  async deleteSheet(spreadsheetToken, sheetId) {
    const key = `${spreadsheetToken}_${sheetId}`;
    if (!this.sheets.has(key)) {
      throw new Error('Sheet not found');
    }
    
    this.sheets.delete(key);
    
    for (const cellKey of this.cells.keys()) {
      if (cellKey.startsWith(`${sheetId}!`)) {
        this.cells.delete(cellKey);
      }
    }
    
    logger.info(`Sheet deleted: ${sheetId}`);
    return { success: true };
  }

  async updateSheetProperties(spreadsheetToken, sheetId, properties) {
    const key = `${spreadsheetToken}_${sheetId}`;
    const sheet = this.sheets.get(key);
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    Object.assign(sheet, properties);
    logger.info(`Sheet updated: ${sheetId}`);
    return sheet;
  }

  async insertDimension(spreadsheetToken, sheetId, dimension, startIndex, endIndex) {
    const key = `${spreadsheetToken}_${sheetId}`;
    const sheet = this.sheets.get(key);
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    const count = endIndex - startIndex;
    
    if (dimension === 'ROWS') {
      sheet.row_count += count;
    } else {
      sheet.column_count += count;
    }
    
    logger.info(`Dimension inserted: ${dimension} ${startIndex}-${endIndex}`);
    return { success: true };
  }

  async deleteDimension(spreadsheetToken, sheetId, dimension, startIndex, endIndex) {
    const key = `${spreadsheetToken}_${sheetId}`;
    const sheet = this.sheets.get(key);
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    logger.info(`Dimension deleted: ${dimension} ${startIndex}-${endIndex}`);
    return { success: true };
  }

  async findAndReplace(spreadsheetToken, sheetId, find, replacement, options = {}) {
    let matchedCells = [];
    
    for (const [cellKey, value] of this.cells.entries()) {
      if (cellKey.startsWith(`${sheetId}!`)) {
        let cellValue = String(value);
        let found = false;
        
        if (options.searchByRegex) {
          const regex = new RegExp(find, options.matchCase ? 'g' : 'gi');
          found = regex.test(cellValue);
        } else if (options.matchEntireCell) {
          if (options.matchCase) {
            found = cellValue === find;
          } else {
            found = cellValue.toLowerCase() === find.toLowerCase();
          }
        } else {
          if (options.matchCase) {
            found = cellValue.includes(find);
          } else {
            found = cellValue.toLowerCase().includes(find.toLowerCase());
          }
        }
        
        if (found) {
          if (options.matchCase) {
            this.cells.set(cellKey, cellValue.replace(new RegExp(find, 'g'), replacement));
          } else {
            this.cells.set(cellKey, cellValue.replace(new RegExp(find, 'gi'), replacement));
          }
          matchedCells.push(cellKey.split('!')[1]);
        }
      }
    }
    
    logger.info(`Find and replace: ${find} -> ${replacement}, matched: ${matchedCells.length}`);
    
    return {
      matched_cells: matchedCells,
      rows_count: matchedCells.length,
    };
  }

  async listSpreadsheets() {
    return Array.from(this.spreadsheets.values());
  }

  async deleteSpreadsheet(spreadsheetToken) {
    if (!this.spreadsheets.has(spreadsheetToken)) {
      throw new Error('Spreadsheet not found');
    }
    
    this.spreadsheets.delete(spreadsheetToken);
    
    for (const key of this.sheets.keys()) {
      if (key.startsWith(`${spreadsheetToken}_`)) {
        this.sheets.delete(key);
      }
    }
    
    logger.info(`Spreadsheet deleted: ${spreadsheetToken}`);
    return { success: true };
  }
}

module.exports = new SimpleSheetService();
