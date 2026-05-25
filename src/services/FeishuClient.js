const axios = require('axios');
const config = require('../config');
const tokenManager = require('./TokenManager');
const logger = require('../utils/logger');
const { FeishuApiError } = require('../utils/error');

class FeishuClient {
  constructor() {
    this.config = config.feishu;
    this.baseUrl = this.config.domain;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const token = await tokenManager.getTenantAccessToken();
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const requestConfig = {
      method,
      url,
      headers,
      timeout: options.timeout || 30000,
    };

    if (data) {
      if (method === 'GET') {
        requestConfig.params = data;
      } else {
        requestConfig.data = data;
      }
    }

    return await this.executeRequest(requestConfig, 0);
  }

  async executeRequest(requestConfig, attempt) {
    const startTime = Date.now();
    
    try {
      logger.debug(`Feishu API Request: ${requestConfig.method} ${requestConfig.url} (Attempt: ${attempt + 1})`);
      
      const response = await axios(requestConfig);
      const data = response.data;
      
      const duration = Date.now() - startTime;
      logger.debug(`Feishu API Response: ${requestConfig.method} ${requestConfig.url} - Status: ${data.code} (${duration}ms)`);

      if (data.code === 0) {
        return data.data || data;
      }

      if (this.shouldRetry(data.code) && attempt < this.maxRetries - 1) {
        if (data.code === 99991663) {
          logger.warn('Token expired, clearing cache and retrying');
          await tokenManager.clearTokenCache();
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt);
        logger.info(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
        
        return this.executeRequest(requestConfig, attempt + 1);
      }

      throw new FeishuApiError(data.msg || 'Feishu API error', data.code);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof FeishuApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        logger.error(`Feishu API Error: ${requestConfig.method} ${requestConfig.url} - ${error.message} (${duration}ms)`);
        
        if (attempt < this.maxRetries - 1 && (error.code === 'ECONNABORTED' || !error.response || error.response.status >= 500)) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logger.info(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.executeRequest(requestConfig, attempt + 1);
        }
        
        throw new FeishuApiError(
          error.response?.data?.msg || error.message,
          error.response?.data?.code || -1
        );
      }

      throw error;
    }
  }

  shouldRetry(code) {
    const retryableCodes = [
      99991663,
      10013,
      10014,
    ];
    return retryableCodes.includes(code);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createDocument(folderToken, title, content = '') {
    return await this.request('POST', '/open-apis/drive/v1/files/create', {
      name: title,
      type: 'docx',
      folder_token: folderToken,
    });
  }

  async getDocument(docToken) {
    return await this.request('GET', `/open-apis/docx/v1/documents/${docToken}`);
  }

  async getDocumentBlocks(docToken, pageToken = '') {
    return await this.request('GET', `/open-apis/docx/v1/documents/${docToken}/blocks`, {
      page_token: pageToken,
    });
  }

  async batchGetFiles(fileTokens) {
    return await this.request('POST', '/open-apis/drive/v1/files/batch_get', {
      file_tokens: fileTokens,
    });
  }

  async createFolder(parentFolderToken, name) {
    return await this.request('POST', '/open-apis/drive/v1/files/create_folder', {
      name,
      folder_token: parentFolderToken,
    });
  }

  async getFolderChildren(folderToken, pageToken = '', pageSize = 50) {
    return await this.request('GET', `/open-apis/drive/v1/files/${folderToken}/list`, {
      page_size: pageSize,
      page_token: pageToken,
    });
  }

  async getFolderMeta(folderToken) {
    return await this.request('GET', `/open-apis/drive/v1/folders/${folderToken}/meta`);
  }

  async getRootFolderMeta() {
    return await this.request('GET', '/open-apis/drive/v1/root_folder/meta');
  }

  async copyFile(fileToken, name, folderToken) {
    return await this.request('POST', '/open-apis/drive/v1/files/copy', {
      file_token: fileToken,
      name,
      type: 'file',
      folder_token: folderToken,
    });
  }

  async moveFile(fileToken, folderToken) {
    return await this.request('POST', '/open-apis/drive/v1/files/move', {
      file_token: fileToken,
      type: 'file',
      folder_token: folderToken,
    });
  }

  async deleteFile(fileToken) {
    return await this.request('DELETE', `/open-apis/drive/v1/files/${fileToken}`);
  }

  async searchDocuments(query, pageSize = 20, pageToken = '') {
    return await this.request('POST', '/open-apis/drive/v1/search', {
      query,
      page_size: pageSize,
      page_token: pageToken,
    });
  }

  async createFileVersion(fileToken, title = '') {
    return await this.request('POST', `/open-apis/drive/v1/files/${fileToken}/versions`, {
      title,
    });
  }

  async getFileVersions(fileToken, pageToken = '', pageSize = 20) {
    return await this.request('GET', `/open-apis/drive/v1/files/${fileToken}/versions`, {
      page_token: pageToken,
      page_size: pageSize,
    });
  }

  async getFileVersion(fileToken, versionId) {
    return await this.request('GET', `/open-apis/drive/v1/files/${fileToken}/versions/${versionId}`);
  }

  async deleteFileVersion(fileToken, versionId) {
    return await this.request('DELETE', `/open-apis/drive/v1/files/${fileToken}/versions/${versionId}`);
  }

  async addPermissionMember(fileToken, memberType, memberId, perm) {
    return await this.request('POST', `/open-apis/drive/v1/files/${fileToken}/permission/members`, {
      member_type: memberType,
      member_id: memberId,
      perm,
    });
  }

  async removePermissionMember(fileToken, memberType, memberId) {
    return await this.request('DELETE', `/open-apis/drive/v1/files/${fileToken}/permission/members/${memberType}:${memberId}`);
  }

  async listPermissionMembers(fileToken, pageToken = '', pageSize = 20) {
    return await this.request('GET', `/open-apis/drive/v1/files/${fileToken}/permission/members`, {
      page_token: pageToken,
      page_size: pageSize,
    });
  }
}

module.exports = new FeishuClient();
