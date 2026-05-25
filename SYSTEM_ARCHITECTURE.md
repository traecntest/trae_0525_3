# 飞书云文档管理系统 - 系统架构设计

## 一、系统整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          前端应用层                              │
│  Web端 / 移动端 / 小程序                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Node.js API服务层                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Express/Koa Web框架                                       │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  中间件层                                                  │ │
│  │  - 认证中间件 (JWT/OAuth)                                  │ │
│  │  - 权限验证中间件                                          │ │
│  │  - 日志中间件                                              │ │
│  │  - 限流中间件                                              │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  业务逻辑层                                                │ │
│  │  ├── 文档管理模块                                          │ │
│  │  ├── 文件夹管理模块                                        │ │
│  │  ├── 权限管理模块                                          │ │
│  │  ├── 版本管理模块                                          │ │
│  │  ├── 搜索索引模块                                          │ │
│  │  └── 事件处理模块                                          │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  统一请求封装层                                            │ │
│  │  - Token管理 (Redis缓存)                                   │ │
│  │  - 请求重试机制                                            │ │
│  │  - 错误码映射                                              │ │
│  │  - 日志记录                                                │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌─────────────────┐
│     MySQL     │      │     Redis     │      │   飞书OpenAPI   │
│  (主数据库)    │      │  (缓存/锁)     │      │   (云文档服务)   │
├───────────────┤      ├───────────────┤      └─────────────────┘
│ - 文档表      │      │ - Token缓存   │
│ - 文件夹表    │      │ - 热点数据缓存│
│ - 权限表      │      │ - 分布式锁    │
│ - 用户关联表  │      │ - 任务状态    │
│ - 内容片段表  │      │ - 会话存储    │
└───────────────┘      └───────────────┘
```

---

## 二、目录结构设计

```
feishu-docs-manager/
├── src/
│   ├── config/              # 配置文件
│   │   ├── index.js         # 主配置
│   │   ├── database.js      # 数据库配置
│   │   ├── redis.js         # Redis配置
│   │   └── feishu.js        # 飞书配置
│   ├── middlewares/         # 中间件
│   │   ├── auth.js          # 认证中间件
│   │   ├── permission.js    # 权限验证中间件
│   │   ├── errorHandler.js  # 错误处理中间件
│   │   └── logger.js        # 日志中间件
│   ├── services/            # 业务服务层
│   │   ├── FeishuClient.js  # 飞书API客户端封装
│   │   ├── TokenManager.js  # Token管理服务
│   │   ├── DocumentService.js  # 文档服务
│   │   ├── FolderService.js    # 文件夹服务
│   │   ├── PermissionService.js # 权限服务
│   │   └── VersionService.js    # 版本服务
│   ├── models/              # 数据模型
│   │   ├── Document.js      # 文档模型
│   │   ├── Folder.js        # 文件夹模型
│   │   ├── Permission.js    # 权限模型
│   │   └── User.js          # 用户模型
│   ├── controllers/         # 控制器层
│   │   ├── DocumentController.js
│   │   ├── FolderController.js
│   │   ├── PermissionController.js
│   │   └── VersionController.js
│   ├── routes/              # 路由层
│   │   ├── index.js
│   │   ├── documents.js
│   │   ├── folders.js
│   │   ├── permissions.js
│   │   └── versions.js
│   ├── utils/               # 工具函数
│   │   ├── logger.js        # 日志工具
│   │   ├── redis.js         # Redis工具
│   │   ├── lock.js          # 分布式锁
│   │   └── error.js         # 错误类
│   ├── cache/               # 缓存层
│   │   ├── tokenCache.js
│   │   └── documentCache.js
│   └── app.js               # 应用入口
├── database/
│   ├── migrations/          # 数据库迁移文件
│   └── schema.sql           # 数据库表结构
├── tests/                   # 测试文件
├── .env.example             # 环境变量示例
├── package.json
└── README.md
```

---

## 三、核心模块设计

### 3.1 统一请求封装层

```javascript
class FeishuClient {
  // 功能：
  // 1. Token自动获取与刷新（Redis缓存）
  // 2. 请求重试机制（指数退避）
  // 3. 超时控制
  // 4. 错误码映射
  // 5. 请求/响应日志
}
```

### 3.2 Token管理服务

```javascript
class TokenManager {
  // 功能：
  // 1. 从Redis获取缓存的token
  // 2. 检测token是否过期
  // 3. 自动刷新token
  // 4. 分布式锁防止并发刷新
}
```

### 3.3 分布式锁

```javascript
class DistributedLock {
  // 基于Redis SETNX实现
  // 功能：
  // 1. 获取锁（带过期时间）
  // 2. 释放锁
  // 3. 自动续期（看门狗）
}
```

---

## 四、API接口设计

| 接口路径 | 方法 | 功能 |
|----------|------|------|
| `/api/documents` | POST | 创建文档 |
| `/api/documents/:id` | GET | 获取文档详情 |
| `/api/documents/:id/content` | GET | 获取文档内容 |
| `/api/documents/:id/content` | PUT | 更新文档内容 |
| `/api/documents/:id` | DELETE | 删除文档 |
| `/api/folders` | POST | 创建文件夹 |
| `/api/folders/:id` | GET | 获取文件夹内容 |
| `/api/permissions` | POST | 设置权限 |
| `/api/permissions/:documentId` | GET | 获取权限列表 |
| `/api/versions/:documentId` | GET | 获取版本列表 |
| `/api/versions/:documentId/compare` | POST | 版本对比 |
