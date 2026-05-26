const config = require('../config');
const logger = require('../utils/logger');
const axios = require('axios');

class SheetService {
  constructor() {
    this.baseUrl = config.feishu.domain;
    this.tokenKey = config.feishu.tokenKey;
  }

  async getTenantToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret,
      });
      
      if (response.data.code !== 0) {
        throw new Error(`Failed to get tenant token: ${response.data.msg}`);
      }
      
      return response.data.tenant_access_token;
    } catch (error) {
      logger.error('Get tenant token error:', error);
      throw error;
    }
  }

  async request(method, path, data = null, params = null) {
    const token = await this.getTenantToken();
    
    const config = {
      method: method,
      url: `${this.baseUrl}${path}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
    
    if (data) config.data = data;
    if (params) config.params = params;
    
    try {
      const response = await axios(config);
      
      if (response.data.code !== 0) {
        logger.error(`Feishu API error: ${response.data.msg}`, response.data);
        throw new Error(`Feishu API error: ${response.data.msg}`);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Request error ${method} ${path}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createSpreadsheet(title, folderToken = null) {
    const data = {
      title: title,
    };
    
    if (folderToken) {
      data.folder_token = folderToken;
    }
    
    const result = await this.request('POST', '/open-apis/sheets/v3/spreadsheets', data);
    logger.info(`Spreadsheet created: ${result.data.spreadsheet.title} - ${result.data.spreadsheet.spreadsheet_token}`);
    return result.data.spreadsheet;
  }

  async getSpreadsheet(spreadsheetToken) {
    const result = await this.request('GET', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}`);
    return result.data.spreadsheet;
  }

  async getSheets(spreadsheetToken) {
    const result = await this.request('GET', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets/query`);
    return result.data.items || [];
  }

  async getSheetMetainfo(spreadsheetToken) {
    const result = await this.request('GET', `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/metainfo`);
    return result.data;
  }

  async readRange(spreadsheetToken, range, options = {}) {
    const params = {};
    if (options.valueRenderOption) params.valueRenderOption = options.valueRenderOption;
    if (options.dateTimeRenderOption) params.dateTimeRenderOption = options.dateTimeRenderOption;
    
    const result = await this.request(
      'GET', 
      `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values/${encodeURIComponent(range)}`,
      null,
      params
    );
    return result.data.valueRange;
  }

  async writeRange(spreadsheetToken, range, values) {
    const data = {
      valueRange: {
        range: range,
        values: values,
      },
    };
    
    const result = await this.request('PUT', `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values`, data);
    logger.info(`Range written: ${range}, cells: ${result.data.updatedCells}`);
    return result.data;
  }

  async addSheet(spreadsheetToken, title) {
    const data = {
      requests: [{
        addSheet: {
          properties: {
            title: title,
          },
        },
      }],
    };
    
    const result = await this.request('POST', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets_batch_update`, data);
    return result.data.replies[0].addSheet.properties;
  }

  async deleteSheet(spreadsheetToken, sheetId) {
    const data = {
      requests: [{
        deleteSheet: {
          sheetId: sheetId,
        },
      }],
    };
    
    const result = await this.request('POST', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets_batch_update`, data);
    return result.data;
  }

  async updateSheetProperties(spreadsheetToken, sheetId, properties) {
    const data = {
      requests: [{
        updateSheet: {
          properties: {
            sheetId: sheetId,
            ...properties,
          },
          fields: Object.keys(properties).join(','),
        },
      }],
    };
    
    const result = await this.request('POST', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets_batch_update`, data);
    return result.data;
  }

  async insertDimension(spreadsheetToken, sheetId, dimension, startIndex, endIndex) {
    const data = {
      range: {
        sheetId: sheetId,
        dimension: dimension,
        startIndex: startIndex,
        endIndex: endIndex,
      },
      inheritStyle: 'BEFORE',
    };
    
    const result = await this.request('POST', `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/dimension_range`, data);
    return result.data;
  }

  async deleteDimension(spreadsheetToken, sheetId, dimension, startIndex, endIndex) {
    const data = {
      range: {
        sheetId: sheetId,
        dimension: dimension,
        startIndex: startIndex,
        endIndex: endIndex,
      },
    };
    
    const result = await this.request('DELETE', `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/dimension_range`, data);
    return result.data;
  }

  async findAndReplace(spreadsheetToken, sheetId, find, replacement, options = {}) {
    const data = {
      find_condition: {
        range: sheetId,
        match_case: options.matchCase || false,
        match_entire_cell: options.matchEntireCell || false,
        search_by_regex: options.searchByRegex || false,
        include_formulas: options.includeFormulas || false,
      },
      find: find,
      replacement: replacement,
    };
    
    const result = await this.request('POST', `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets/${sheetId}/replace`, data);
    return result.data.replace_result;
  }
}

module.exports = new SheetService();
