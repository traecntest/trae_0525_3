const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Folder = require('./Folder');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  feishuFileToken: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    field: 'feishu_file_token',
  },
  feishuDocToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'feishu_doc_token',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'docx, sheet, bitable',
  },
  folderId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'folder_id',
  },
  ownerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'owner_id',
  },
  feishuOwnerId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'feishu_owner_id',
  },
  feishuCreateTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'feishu_create_time',
  },
  feishuModifyTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'feishu_modify_time',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'view_count',
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '0: deleted, 1: active',
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'synced_at',
  },
}, {
  tableName: 'documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

Document.belongsTo(Folder, { as: 'folder', foreignKey: 'folderId' });
Document.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

module.exports = Document;
