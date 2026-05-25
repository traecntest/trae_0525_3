const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  resourceType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'resource_type',
    comment: 'document, folder',
  },
  resourceId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'resource_id',
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'user_id',
  },
  groupId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'group_id',
  },
  permissionLevel: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'permission_level',
    comment: 'view, comment, edit, manage',
  },
  permissionType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'feishu',
    field: 'permission_type',
    comment: 'feishu, local',
  },
  extraConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'extra_config',
  },
  expireAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expire_at',
  },
  grantedBy: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'granted_by',
  },
}, {
  tableName: 'permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['resource_type', 'resource_id', 'user_id'] },
    { unique: true, fields: ['resource_type', 'resource_id', 'group_id'] },
  ],
});

Permission.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Permission.belongsTo(User, { as: 'grantor', foreignKey: 'grantedBy' });

module.exports = Permission;
