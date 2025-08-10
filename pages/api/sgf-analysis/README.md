# SGF 分析 API 文档

## 概述

SGF 分析 API 提供了完整的围棋 SGF 文件分析结果的存储、检索和管理功能。

## API 端点

### 1. 获取分析列表

**GET** `/api/sgf-analysis`

#### 查询参数
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 10
- `userId` (string): 用户 ID 筛选
- `status` (string): 状态筛选 (pending, analyzing, completed, failed)
- `isPublic` (boolean): 是否公开
- `search` (string): 搜索关键词

#### 响应示例
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "sgfInfo": {
        "filename": "game1.sgf",
        "originalName": "职业对局.sgf"
      },
      "gameInfo": {
        "blackPlayer": "柯洁",
        "whitePlayer": "朴廷桓"
      },
      "statistics": {
        "totalMoves": 250,
        "blunders": 2,
        "mistakes": 5
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2. 获取分析详情

**GET** `/api/sgf-analysis/[id]`

#### 响应示例
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "sgfInfo": { ... },
    "gameInfo": { ... },
    "analysisConfig": { ... },
    "moveAnalyses": [
      {
        "moveNumber": 1,
        "player": "black",
        "position": { "row": 15, "col": 3 },
        "analysis": {
          "suggestions": [
            {
              "move": { "row": 15, "col": 3 },
              "winrate": 0.52,
              "score": 1.2,
              "visits": 1000,
              "order": 1
            }
          ],
          "evaluation": {
            "winrate": 0.52,
            "score": 1.2,
            "visits": 1000
          },
          "analysisTime": 5000,
          "isBestMove": true,
          "scoreLoss": 0
        }
      }
    ],
    "statistics": { ... }
  }
}
```

### 3. 保存分析结果

**POST** `/api/sgf-analysis`

#### 请求体
```json
{
  "sgfInfo": {
    "filename": "game1.sgf",
    "originalName": "职业对局.sgf",
    "fileSize": 12345,
    "uploadPath": "/uploads/game1.sgf"
  },
  "gameInfo": {
    "blackPlayer": "柯洁",
    "whitePlayer": "朴廷桓",
    "result": "B+R",
    "komi": 6.5,
    "boardSize": 19
  },
  "analysisConfig": {
    "katagoVersion": "1.11.0",
    "modelName": "kata1-b40c256-s11840935168-d2898845681.bin.gz",
    "maxVisits": 1000,
    "analysisTime": 10,
    "startMove": 1,
    "endMove": 250
  },
  "moveAnalyses": [ ... ],
  "userId": "user_id_here",
  "username": "用户名",
  "isPublic": false,
  "tags": ["职业对局", "AI分析"],
  "notes": "这是一局精彩的对局"
}
```

### 4. 批量保存分析结果

**POST** `/api/sgf-analysis/batch`

#### 请求体
```json
{
  "analyses": [
    { /* 分析数据1 */ },
    { /* 分析数据2 */ },
    { /* 分析数据3 */ }
  ]
}
```

### 5. 更新分析记录

**PUT** `/api/sgf-analysis/[id]`

#### 请求体
```json
{
  "isPublic": true,
  "tags": ["更新的标签"],
  "notes": "更新的备注"
}
```

### 6. 删除分析记录

**DELETE** `/api/sgf-analysis/[id]`

### 7. 获取统计数据

**GET** `/api/sgf-analysis/stats`

#### 查询参数
- `userId` (string): 用户 ID
- `timeRange` (string): 时间范围 (7d, 30d, 90d)

## 数据模型

### MoveAnalysis (单步分析)
```javascript
{
  moveNumber: Number,        // 手数
  player: String,           // 'black' | 'white'
  position: {               // 落子位置
    row: Number,
    col: Number
  },
  analysis: {
    suggestions: [{         // AI 推荐走法
      move: { row: Number, col: Number },
      winrate: Number,      // 胜率 (0-1)
      score: Number,        // 分数
      visits: Number,       // 访问次数
      pv: [String],        // 主要变化
      order: Number        // 推荐顺序
    }],
    evaluation: {           // 当前局面评估
      winrate: Number,
      score: Number,
      visits: Number
    },
    analysisTime: Number,   // 分析用时(ms)
    isBestMove: Boolean,    // 是否最佳手
    scoreLoss: Number       // 分数损失
  }
}
```

## 前端集成示例

### 保存分析结果
```javascript
// 分析完成后保存到后端
async function saveAnalysisToBackend(analysisData) {
  try {
    const response = await fetch('/api/sgf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('分析结果保存成功:', result.data._id);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('保存分析结果失败:', error);
    throw error;
  }
}
```

### 加载历史分析
```javascript
// 页面刷新时加载已有的分析结果
async function loadExistingAnalysis(sgfFilename) {
  try {
    const response = await fetch(`/api/sgf-analysis?search=${encodeURIComponent(sgfFilename)}&limit=1`);
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error('加载分析结果失败:', error);
    return null;
  }
}
```

## 错误处理

所有 API 都返回统一的错误格式：
```json
{
  "success": false,
  "error": "错误描述",
  "details": "详细错误信息"
}
```

## 注意事项

1. **数据大小**: 单个分析记录可能包含大量数据，建议在列表接口中不返回 `moveAnalyses` 详细数据
2. **索引优化**: 已为常用查询字段添加数据库索引
3. **权限控制**: 目前支持匿名分析，后续可根据需要添加权限验证
4. **缓存策略**: 建议在前端实现适当的缓存机制，避免重复请求