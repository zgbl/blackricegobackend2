# KataGo API 代理

这个目录包含了用于代理 KataGo 服务器请求的 API 端点。

## 可用端点

### 1. `/api/katago/info`
- **方法**: GET
- **描述**: 获取 KataGo 服务器信息
- **响应**: 
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

### 2. `/api/katago/health`
- **方法**: GET
- **描述**: 检查 KataGo 服务器健康状态
- **响应**:
```json
{
  "success": true,
  "status": "healthy",
  "serverUrl": "http://192.168.0.249:8080",
  "response": "OK",
  "timestamp": "2024-01-20T21:11:54.000Z"
}
```

### 3. `/api/katago/analyze`
- **方法**: POST
- **描述**: 代理 SGF 分析请求到 KataGo 服务器
- **请求体**: KataGo 分析请求格式
- **响应**: KataGo 分析结果

### 4. `/api/katago/test`
- **方法**: GET
- **描述**: 测试 KataGo 服务器的各种端点
- **响应**: 详细的测试结果

## 使用方法

在你的前端代码中，将 KataGo 服务器地址从：
```javascript
http://192.168.0.249:8080/info
```

改为：
```javascript
/api/katago/info
```

这样可以避免 CORS 问题，并且提供更好的错误处理。

## 配置

如果需要更改 KataGo 服务器地址，请修改各个 API 文件中的 `katagoServerUrl` 变量。

## 错误处理

所有 API 都包含了完善的错误处理：
- 连接超时
- 服务器不可达
- HTTP 错误状态
- JSON 解析错误

## CORS 支持

所有 API 都通过 `withCors.js` 中间件支持 CORS，允许从以下域名访问：
- http://weiqi.blackrice.top
- https://weiqi.blackrice.top
- http://localhost:3000
- 等等...