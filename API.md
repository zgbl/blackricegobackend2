# 黑米围棋后端 API 文档

## 概述

本项目是基于 Next.js + MongoDB 的围棋相关后端服务，提供用户认证、SGF分析、测试题管理、论坛、比赛管理等功能。

**基础URL**: `http://localhost:3000` (开发环境)

**支持的域名**:
- `http://weiqi.blackrice.top`
- `https://weiqi.blackrice.top`
- `http://forum.blackrice.top`
- `https://forum.blackrice.top`
- `http://localhost:3000`
- `https://zgbl.github.io`

---

## 1. 用户认证 API

### 1.1 用户注册

**POST** `/api/register`

#### 请求体
```json
{
  "username": "testuser",
  "email": "testuser@example.com",
  "password": "password123"
}
```

#### 响应
```json
{
  "message": "User created",
  "user": {
    "_id": "...",
    "username": "testuser",
    "email": "testuser@example.com"
  }
}
```

### 1.2 用户登录

**POST** `/api/login`

#### 请求体
```json
{
  "email": "testuser@example.com",
  "password": "password123"
}
```

#### 响应
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "...",
    "username": "testuser",
    "email": "testuser@example.com"
  }
}
```

### 1.3 用户登出

**GET** `/api/logout`

#### 响应
```json
{
  "message": "Logged out successfully"
}
```

---

## 2. 测试题管理 API

### 2.1 批量创建测试题

**POST** `/api/testQuestions`

#### 请求体
```json
{
  "questions": [
    {
      "sgfHash": "abc123",
      "moveNumber": 50,
      "boardState": [[0, 1, -1], ...],
      "candidatePoints": [
        {
          "row": 3,
          "col": 3,
          "winRate": 65.5
        }
      ],
      "correctAnswer": {
        "row": 3,
        "col": 3,
        "winRate": 65.5
      },
      "winRateLoss": 15.2,
      "difficulty": "medium",
      "questionText": "黑棋下一手的最佳选择是？"
    }
  ],
  "metadata": {
    "source": "professional_games",
    "batchId": "batch_001"
  },
  "overwrite": false
}
```

#### 响应
```json
{
  "success": true,
  "message": "成功创建 5 个测试题",
  "data": {
    "created": 5,
    "skipped": 0,
    "total": 5
  }
}
```

### 2.2 获取测试题列表

**GET** `/api/testQuestions`

#### 查询参数
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 20，最大 100
- `sgfHash` (string): SGF哈希值筛选
- `difficulty` (string): 难度筛选 (easy, medium, hard)
- `sortBy` (string): 排序字段 (createdAt, moveNumber, winRateLoss, difficulty)
- `sortOrder` (string): 排序方向 (asc, desc)
- `includeDetails` (boolean): 是否包含详细数据，默认 true

#### 响应
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "sgfHash": "abc123",
      "moveNumber": 50,
      "boardState": [[0, 1, -1], ...],
      "candidatePoints": [...],
      "correctAnswer": {...},
      "difficulty": "medium",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2.3 获取单个测试题详情

**GET** `/api/testQuestions/[id]`

#### 响应
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "sgfHash": "abc123",
    "moveNumber": 50,
    "boardState": [[0, 1, -1], ...],
    "candidatePoints": [...],
    "correctAnswer": {...},
    "difficulty": "medium",
    "questionText": "黑棋下一手的最佳选择是？",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2.4 获取测试题统计信息

**GET** `/api/testQuestions/stats`

#### 响应
```json
{
  "success": true,
  "data": {
    "totalQuestions": 1500,
    "difficultyStats": {
      "easy": 500,
      "medium": 700,
      "hard": 300
    },
    "sgfStats": {
      "totalSgfFiles": 150,
      "avgQuestionsPerSgf": 10
    },
    "recentStats": {
      "last24h": 25,
      "last7days": 180,
      "last30days": 750
    }
  }
}
```

---

## 3. 答题页面 API

### 3.1 获取答题题目

**POST** `/api/quiz/questions`

#### 请求体
```json
{
  "source": "all",
  "count": 10,
  "random": true
}
```

#### 响应
```json
{
  "success": true,
  "data": [
    {
      "questionNumber": 1,
      "boardState": [[0, 1, -1], ...],
      "candidates": [
        {
          "label": "A",
          "row": 3,
          "col": 3,
          "winRateChange": "+15.2%"
        }
      ],
      "correctAnswer": "A",
      "difficulty": "medium",
      "questionText": "黑棋下一手的最佳选择是？"
    }
  ],
  "total": 10,
  "totalQuestionsInDatabase": 1500
}
```

---

## 4. SGF 分析 API

### 4.1 保存分析结果

**POST** `/api/saveAnalysis`

#### 请求体
```json
{
  "sgf": "(;FF[4]GM[1]SZ[19]...)",
  "analysisConfig": {
    "visits": 1000,
    "playoutDoublingAdvantage": 0.0
  },
  "analysisResults": {
    "moves": [...],
    "rootInfo": {...}
  },
  "metadata": {
    "filename": "game.sgf",
    "uploadTime": "2024-01-15T10:30:00Z"
  }
}
```

### 4.2 获取分析列表

**GET** `/api/sgf-analysis`

#### 查询参数
- `page` (number): 页码
- `limit` (number): 每页数量
- `userId` (string): 用户ID筛选
- `status` (string): 状态筛选
- `isPublic` (boolean): 是否公开
- `search` (string): 搜索关键词

### 4.3 获取分析详情

**GET** `/api/sgf-analysis/[id]`

### 4.4 更新分析

**PUT** `/api/sgf-analysis/[id]`

### 4.5 删除分析

**DELETE** `/api/sgf-analysis/[id]`

### 4.6 批量操作

**POST** `/api/sgf-analysis/batch`

### 4.7 获取分析统计

**GET** `/api/sgf-analysis/stats`

---

## 5. KataGo 代理 API

### 5.1 获取服务器信息

**GET** `/api/katago/info`

#### 响应
```json
{
  "success": true,
  "data": {
    "name": "KataGo Server",
    "version": "1.15.0",
    "status": "healthy",
    "serverUrl": "http://192.168.0.249:8080",
    "endpoints": {
      "health": "http://192.168.0.249:8080/health",
      "analyze": "http://192.168.0.249:8080/analyze",
      "query": "http://192.168.0.249:8080/query"
    },
    "features": [
      "SGF Analysis",
      "Position Evaluation",
      "Move Suggestions",
      "Territory Estimation"
    ],
    "timestamp": "2024-01-20T21:11:54.000Z"
  }
}
```

### 5.2 健康检查

**GET** `/api/katago/health`

### 5.3 分析请求

**POST** `/api/katago/analyze`

### 5.4 测试端点

**GET** `/api/katago/test`

---

## 6. 论坛 API

### 6.1 获取帖子列表

**GET** `/api/forum/Posts`

#### 查询参数
- `page` (number): 页码
- `limit` (number): 每页数量
- `category` (string): 分类筛选
- `search` (string): 搜索关键词

#### 响应
```json
{
  "posts": [...],
  "hasNextPage": true,
  "hasPrevPage": false,
  "currentPage": 1,
  "totalPages": 10,
  "totalPosts": 100,
  "limit": 10
}
```

---

## 7. 比赛管理 API

### 7.1 获取比赛列表

**GET** `/api/tournament/list`

#### 响应
```json
{
  "success": true,
  "tournaments": [
    {
      "_id": "...",
      "name": "春季围棋大赛",
      "location": "北京",
      "date": "2024-03-15",
      "status": "upcoming"
    }
  ]
}
```

### 7.2 创建比赛

**POST** `/api/tournament/create`

### 7.3 获取比赛详情

**GET** `/api/tournament/[id]`

---

## 8. 评论 API

### 8.1 获取评论列表

**GET** `/api/comments`

### 8.2 创建评论

**POST** `/api/comments`

#### 请求体
```json
{
  "content": "这是一个很好的分析",
  "username": "用户名",
  "originalMoves": [],
  "variationMoves": []
}
```

---

## 9. 其他 API

### 9.1 测试接口

**GET** `/api/test`

### 9.2 SGF分析结果

**GET** `/api/sgf-analysis-results`

---

## 错误处理

所有API都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": "详细错误信息"
}
```

### 常见错误码

- `400` - 请求参数错误
- `401` - 未授权
- `403` - 禁止访问
- `404` - 资源不存在
- `405` - 方法不允许
- `409` - 资源冲突
- `500` - 服务器内部错误

---

## CORS 配置

所有API都支持CORS，允许以下域名访问：

- `http://weiqi.blackrice.top`
- `https://weiqi.blackrice.top`
- `http://forum.blackrice.top`
- `https://forum.blackrice.top`
- `https://zgbl.github.io`
- `http://localhost:3000`
- `https://localhost:3000`
- `http://localhost:8090`
- `https://localhost:8090`

---

## 数据模型

### TestQuestion 模型
```javascript
{
  id: String,
  sgfHash: String,
  moveNumber: Number,
  boardState: [[Number]], // 19x19 数组
  candidatePoints: [{
    row: Number,
    col: Number,
    winRate: Number
  }],
  correctAnswer: {
    row: Number,
    col: Number,
    winRate: Number
  },
  winRateLoss: Number,
  difficulty: String, // 'easy', 'medium', 'hard'
  questionText: String,
  createdAt: Date,
  updatedAt: Date
}
```

### User 模型
```javascript
{
  username: String,
  email: String,
  password: String, // 加密存储
  createdAt: Date,
  updatedAt: Date
}
```

### SGFAnalysis 模型
```javascript
{
  userId: String,
  sgfInfo: {
    filename: String,
    originalName: String
  },
  gameInfo: {
    blackPlayer: String,
    whitePlayer: String,
    event: String,
    date: String
  },
  analysisResults: Object,
  status: String, // 'pending', 'analyzing', 'completed', 'failed'
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 版本信息

- **API版本**: v1.0
- **最后更新**: 2024-01-20
- **技术栈**: Next.js + MongoDB + KataGo