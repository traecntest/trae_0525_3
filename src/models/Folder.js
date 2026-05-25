const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Folder = sequelize.define('Folder', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  feishuFolderToken: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    field: 'feishu_folder_token',
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  parentId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'parent_id',
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
  path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
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
  tableName: 'folders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

Folder.belongsTo(Folder, { as: 'parent', foreignKey: 'parentId' });
Folder.hasMany(Folder, { as: 'children', foreignKey: 'parentId' });
Folder.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
Folder.hasMany(User, { as: 'collaborators', foreignKey: 'ownerId' });

module.exports = Folder;
