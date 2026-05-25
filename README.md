# 飞书云文档管理系统 (Feishu Docs Manager)

基于飞书开放平台云文档API开发的Node.js后端服务，使用MySQL作为主数据库，Redis作为缓存与临时数据存储，为前端提供稳定、可扩展的文档管理能力。

## 功能特性

### 已实现功能
- ✅ 飞书应用访问凭证自动获取与Redis缓存
- ✅ 统一请求封装层（请求签名、超时控制、重试机制、错误码映射、日志记录）
- ✅ 文档管理（创建、读取、更新、删除、复制、移动）
- ✅ 文件夹管理（创建、读取、更新、删除、移动）
- ✅ 文档内容获取（基于飞书Docx API）
- ✅ 数据同步（从飞书同步文档元数据）
- ✅ 热点数据Redis缓存
- ✅ 分布式锁防止并发冲突
- ✅ 操作日志记录

### 需要本地封装的业务逻辑
根据飞书API能力分析，以下功能需要本地实现：
- 🔄 文档块级编辑操作封装
- 🔄 复杂权限组合管理（基础权限用飞书，扩展权限用本地）
- 🔄 历史版本对比功能
- 🔄 内容片段索引与搜索优化

## 技术栈

- **服务端框架**: Express.js
- **数据库**: MySQL 8.0+
- **ORM**: Sequelize
- **缓存**: Redis
- **飞书SDK**: 原生API封装
- **日志**: Winston
- **验证**: Express Validator

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端应用层                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node.js API服务层                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Express路由层                                             │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  中间件层（认证、权限、日志、限流）                         │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  业务服务层（文档、文件夹、权限、版本）                     │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  统一请求封装层（Token管理、重试、错误映射）               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌─────────────────┐
│     MySQL     │      │     Redis     │      │   飞书OpenAPI   │
│  (主数据库)    │      │  (缓存/锁)     │      │   (云文档服务)   │
└───────────────┘      └───────────────┘      └─────────────────┘
```

## 快速开始

### 1. 环境要求

- Node.js 16+
- MySQL 8.0+
- Redis 6.0+
- 飞书企业自建应用

### 2. 飞书应用配置

1. 访问 [飞书开放平台](https://open.feishu.cn) 创建企业自建应用
2. 获取 App ID 和 App Secret
3. 申请以下权限：
   - `docx:document:readonly` - 读取云文档
   - `drive:drive:readonly` - 读取云空间
   - `drive:file:readonly` - 读取文件
   - `drive:file:write` - 写入文件
   - `drive:folder:readonly` - 读取文件夹
   - `drive:folder:write` - 写入文件夹

### 3. 安装与配置

```bash
# 克隆项目
git clone <repository-url>
cd feishu-docs-manager

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置飞书应用和数据库信息
vim .env
```

### 4. 数据库初始化

执行 `database/schema.sql` 创建数据库表：

```bash
mysql -u root -p < database/schema.sql
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 文档

### 基础路径
所有API路径以 `/api` 开头。

### 健康检查
```
GET /api/health
```

### 文档管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/documents | 创建文档 |
| GET | /api/documents | 获取文档列表 |
| GET | /api/documents/:id | 获取文档详情 |
| GET | /api/documents/:id/content | 获取文档内容 |
| PUT | /api/documents/:id | 更新文档信息 |
| DELETE | /api/documents/:id | 删除文档 |
| POST | /api/documents/:id/copy | 复制文档 |
| POST | /api/documents/:id/move | 移动文档 |
| POST | /api/documents/sync | 从飞书同步文档 |

### 文件夹管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/folders | 创建文件夹 |
| GET | /api/folders | 获取文件夹列表 |
| GET | /api/folders/root | 获取根文件夹内容 |
| GET | /api/folders/:id | 获取文件夹详情 |
| GET | /api/folders/:id/children | 获取文件夹子内容 |
| PUT | /api/folders/:id | 更新文件夹信息 |
| DELETE | /api/folders/:id | 删除文件夹 |
| POST | /api/folders/:id/move | 移动文件夹 |

### 请求示例

#### 创建文档
```bash
POST /api/documents
Content-Type: application/json

{
  "title": "我的新文档",
  "type": "docx",
  "folderId": 1
}
```

#### 获取文档列表
```bash
GET /api/documents?folderId=1&page=1&pageSize=20
```

## 数据库设计

系统包含以下核心表：

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| folders | 文件夹表 |
| documents | 文档表 |
| permissions | 权限表 |
| document_fragments | 文档内容片段表（用于版本对比和搜索） |
| document_versions | 文档版本快照表 |
| async_tasks | 异步任务表 |
| operation_logs | 操作日志表 |

详细表结构请参考 `database/schema.sql`。

## 配置说明

### 飞书配置
```env
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_DOMAIN=https://open.feishu.cn
```

### 数据库配置
```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=feishu_docs
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Redis配置
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=feishu:docs:
```

## 核心模块说明

### TokenManager
负责飞书访问凭证的获取、缓存、刷新：
- 使用Redis缓存tenant_access_token
- 自动检测过期并刷新
- 分布式锁防止并发刷新

### FeishuClient
统一的飞书API请求封装：
- 自动添加Authorization头
- 指数退避重试机制
- 错误码统一映射
- 请求/响应日志

### Redis缓存策略
- Token缓存：有效期内直接使用
- 文档元数据：热点文档缓存1小时
- 权限信息：缓存提高验证速度
- 分布式锁：防止并发操作冲突

## 开发说明

### 项目结构
```
feishu-docs-manager/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── middlewares/     # 中间件
│   ├── models/          # 数据模型
│   ├── routes/          # 路由
│   ├── services/        # 业务服务
│   ├── utils/           # 工具函数
│   └── app.js           # 应用入口
├── database/            # 数据库相关
├── tests/               # 测试文件
├── .env.example         # 环境变量示例
└── package.json
```

### 添加新功能
1. 在 `src/services/` 添加业务服务
2. 在 `src/controllers/` 添加控制器
3. 在 `src/routes/` 添加路由
4. 在 `src/models/` 添加数据模型（如需要）

## 扩展功能路线图

- [ ] 用户认证与授权
- [ ] 文档版本对比
- [ ] 高级权限管理
- [ ] 文档全文搜索
- [ ] 事件订阅与实时同步
- [ ] 批量操作
- [ ] 导出/导入功能
- [ ] API限流保护

## 许可证

MIT License

## 相关链接

- [飞书开放平台文档](https://open.feishu.cn/document)
- [飞书云文档API](https://open.feishu.cn/document/server-docs/docs/intro)
- [Express.js文档](https://expressjs.com/)
- [Sequelize文档](https://sequelize.org/)
