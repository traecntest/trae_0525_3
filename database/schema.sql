-- 飞书云文档管理系统 - 数据库表结构设计
-- 创建时间: 2026-05-25

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `feishu_docs` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `feishu_docs`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `feishu_open_id` varchar(64) NOT NULL COMMENT '飞书用户Open ID',
  `feishu_union_id` varchar(64) DEFAULT NULL COMMENT '飞书用户Union ID',
  `name` varchar(100) NOT NULL COMMENT '用户姓名',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feishu_open_id` (`feishu_open_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ----------------------------
-- 文件夹表
-- ----------------------------
DROP TABLE IF EXISTS `folders`;
CREATE TABLE `folders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `feishu_folder_token` varchar(64) NOT NULL COMMENT '飞书文件夹Token',
  `name` varchar(200) NOT NULL COMMENT '文件夹名称',
  `parent_id` bigint(20) unsigned DEFAULT NULL COMMENT '父文件夹ID',
  `owner_id` bigint(20) unsigned NOT NULL COMMENT '所有者用户ID',
  `feishu_owner_id` varchar(64) DEFAULT NULL COMMENT '飞书所有者ID',
  `path` varchar(1000) DEFAULT NULL COMMENT '文件夹路径（用于快速查询）',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 0-已删除, 1-正常',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `synced_at` datetime DEFAULT NULL COMMENT '最后同步飞书时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feishu_folder_token` (`feishu_folder_token`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_owner_id` (`owner_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_folders_parent` FOREIGN KEY (`parent_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_folders_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件夹表';

-- ----------------------------
-- 文档表
-- ----------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `feishu_file_token` varchar(64) NOT NULL COMMENT '飞书文件Token',
  `feishu_doc_token` varchar(64) DEFAULT NULL COMMENT '飞书文档Token（仅文档类型有）',
  `title` varchar(500) NOT NULL COMMENT '文档标题',
  `type` varchar(32) NOT NULL COMMENT '文件类型: docx-文档, sheet-电子表格, bitable-多维表格',
  `folder_id` bigint(20) unsigned DEFAULT NULL COMMENT '所属文件夹ID',
  `owner_id` bigint(20) unsigned NOT NULL COMMENT '所有者用户ID',
  `feishu_owner_id` varchar(64) DEFAULT NULL COMMENT '飞书所有者ID',
  `feishu_create_time` datetime DEFAULT NULL COMMENT '飞书创建时间',
  `feishu_modify_time` datetime DEFAULT NULL COMMENT '飞书最后修改时间',
  `version` int(11) NOT NULL DEFAULT '1' COMMENT '本地版本号',
  `tags` json DEFAULT NULL COMMENT '标签数组',
  `description` text COMMENT '文档描述',
  `view_count` int(11) NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 0-已删除, 1-正常',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `synced_at` datetime DEFAULT NULL COMMENT '最后同步飞书时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feishu_file_token` (`feishu_file_token`),
  KEY `idx_folder_id` (`folder_id`),
  KEY `idx_owner_id` (`owner_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_updated_at` (`updated_at`),
  FULLTEXT KEY `ft_title_description` (`title`, `description`),
  CONSTRAINT `fk_documents_folder` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_documents_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档表';

-- ----------------------------
-- 权限表
-- ----------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `resource_type` varchar(32) NOT NULL COMMENT '资源类型: document-文档, folder-文件夹',
  `resource_id` bigint(20) unsigned NOT NULL COMMENT '资源ID',
  `user_id` bigint(20) unsigned DEFAULT NULL COMMENT '用户ID（与group_id二选一）',
  `group_id` bigint(20) unsigned DEFAULT NULL COMMENT '用户组ID（与user_id二选一）',
  `permission_level` varchar(32) NOT NULL COMMENT '权限级别: view-查看, comment-评论, edit-编辑, manage-管理',
  `permission_type` varchar(32) NOT NULL DEFAULT 'feishu' COMMENT '权限类型: feishu-飞书原生, local-本地扩展',
  `extra_config` json DEFAULT NULL COMMENT '扩展权限配置（如有效期、IP限制等）',
  `expire_at` datetime DEFAULT NULL COMMENT '权限过期时间',
  `granted_by` bigint(20) unsigned NOT NULL COMMENT '授权人用户ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_resource_user` (`resource_type`, `resource_id`, `user_id`),
  UNIQUE KEY `uk_resource_group` (`resource_type`, `resource_id`, `group_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_resource` (`resource_type`, `resource_id`),
  CONSTRAINT `fk_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permissions_granted` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- ----------------------------
-- 文档内容片段表（用于版本对比和搜索）
-- ----------------------------
DROP TABLE IF EXISTS `document_fragments`;
CREATE TABLE `document_fragments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `document_id` bigint(20) unsigned NOT NULL COMMENT '文档ID',
  `version_id` varchar(64) DEFAULT NULL COMMENT '飞书版本ID',
  `local_version` int(11) NOT NULL COMMENT '本地版本号',
  `block_id` varchar(64) DEFAULT NULL COMMENT '飞书文档块ID',
  `block_type` varchar(32) DEFAULT NULL COMMENT '块类型',
  `content` text NOT NULL COMMENT '块内容（纯文本或JSON）',
  `content_hash` varchar(64) DEFAULT NULL COMMENT '内容哈希（用于快速比对）',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '块排序',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_version` (`document_id`, `local_version`),
  KEY `idx_block_id` (`block_id`),
  FULLTEXT KEY `ft_content` (`content`),
  CONSTRAINT `fk_fragments_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档内容片段表';

-- ----------------------------
-- 文档版本快照表
-- ----------------------------
DROP TABLE IF EXISTS `document_versions`;
CREATE TABLE `document_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `document_id` bigint(20) unsigned NOT NULL COMMENT '文档ID',
  `feishu_version_id` varchar(64) DEFAULT NULL COMMENT '飞书版本ID',
  `local_version` int(11) NOT NULL COMMENT '本地版本号',
  `title` varchar(500) NOT NULL COMMENT '版本标题',
  `description` varchar(1000) DEFAULT NULL COMMENT '版本描述',
  `snapshot_data` json DEFAULT NULL COMMENT '版本快照数据',
  `created_by` bigint(20) unsigned NOT NULL COMMENT '创建者用户ID',
  `feishu_created_at` datetime DEFAULT NULL COMMENT '飞书版本创建时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_local_version` (`document_id`, `local_version`),
  KEY `idx_feishu_version_id` (`feishu_version_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_versions_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_versions_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档版本快照表';

-- ----------------------------
-- 异步任务表
-- ----------------------------
DROP TABLE IF EXISTS `async_tasks`;
CREATE TABLE `async_tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_type` varchar(64) NOT NULL COMMENT '任务类型: import-导入, export-导出, copy-复制, sync-同步',
  `task_id` varchar(64) NOT NULL COMMENT '飞书任务ID（如适用）',
  `status` varchar(32) NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待处理, processing-处理中, success-成功, failed-失败',
  `resource_type` varchar(32) DEFAULT NULL COMMENT '资源类型',
  `resource_id` bigint(20) unsigned DEFAULT NULL COMMENT '资源ID',
  `params` json DEFAULT NULL COMMENT '任务参数',
  `result` json DEFAULT NULL COMMENT '任务结果',
  `error_message` text COMMENT '错误信息',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT '创建者用户ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `finished_at` datetime DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_id` (`task_id`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_status` (`status`),
  KEY `idx_resource` (`resource_type`, `resource_id`),
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='异步任务表';

-- ----------------------------
-- 操作日志表
-- ----------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint(20) unsigned DEFAULT NULL COMMENT '操作用户ID',
  `operation_type` varchar(64) NOT NULL COMMENT '操作类型',
  `resource_type` varchar(32) DEFAULT NULL COMMENT '资源类型',
  `resource_id` bigint(20) unsigned DEFAULT NULL COMMENT '资源ID',
  `request_params` json DEFAULT NULL COMMENT '请求参数',
  `response_data` json DEFAULT NULL COMMENT '响应数据',
  `ip_address` varchar(64) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) DEFAULT NULL COMMENT 'User Agent',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态: 0-失败, 1-成功',
  `error_message` varchar(1000) DEFAULT NULL COMMENT '错误信息',
  `duration` int(11) DEFAULT NULL COMMENT '请求耗时（毫秒）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation_type` (`operation_type`),
  KEY `idx_resource` (`resource_type`, `resource_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

SET FOREIGN_KEY_CHECKS = 1;
