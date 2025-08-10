// pages/api/katago/info.js
import allowCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // KataGo 服务器地址
    const katagoServerUrl = 'http://192.168.0.249:8080';
    
    // 提供 KataGo 服务器信息
    let serverInfo = {
      name: "KataGo Server",
      version: "1.15.0", // 常见的 KataGo 版本
      status: "unknown",
      serverUrl: katagoServerUrl,
      endpoints: {
        health: `${katagoServerUrl}/health`,
        analyze: `${katagoServerUrl}/analyze`,
        query: `${katagoServerUrl}/query`
      },
      features: [
        "SGF Analysis",
        "Position Evaluation", 
        "Move Suggestions",
        "Territory Estimation"
      ],
      timestamp: new Date().toISOString()
    };

    // 尝试检查服务器健康状态
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const healthResponse = await fetch(`${katagoServerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain, application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (healthResponse.ok) {
        serverInfo.status = "healthy";
        serverInfo.httpStatus = healthResponse.status;
        
        // 尝试读取响应内容
        try {
          const healthData = await healthResponse.text();
          serverInfo.healthResponse = healthData;
        } catch (e) {
          // 忽略读取错误
        }
      } else {
        serverInfo.status = "unhealthy";
        serverInfo.httpStatus = healthResponse.status;
      }
    } catch (healthError) {
      if (healthError.name === 'AbortError') {
        serverInfo.status = "timeout";
        serverInfo.error = "Health check timeout";
      } else {
        serverInfo.status = "unreachable";
        serverInfo.error = healthError.message;
      }
    }

    res.status(200).json({
      success: true,
      data: serverInfo
    });

  } catch (error) {
    console.error('KataGo info API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KataGo server information',
      message: error.message
    });
  }
}

export default allowCors(handler);