// pages/api/katago/analyze.js
import allowCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const katagoServerUrl = process.env.KATAGO_SERVER_URL || 'http://192.168.0.162:8080';
    console.log(`🚀 Proxying to: ${katagoServerUrl}/analyze`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    // 转发请求到 KataGo 服务器
    const response = await fetch(`${katagoServerUrl}/analyze`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    clearTimeout(timeoutId);

    const data = await response.text();

    if (response.ok) {
      // 尝试解析为 JSON，如果失败则返回原始文本
      try {
        const jsonData = JSON.parse(data);
        res.status(200).json(jsonData);
      } catch {
        res.status(200).send(data);
      }
    } else {
      res.status(response.status).json({
        success: false,
        error: 'KataGo server error',
        status: response.status,
        message: data
      });
    }

  } catch (error) {
    console.error('KataGo analyze API error:', error);

    let status = 503;
    let message = 'Failed to connect to KataGo server';

    if (error.name === 'AbortError') {
      status = 408;
      message = 'Request timeout';
    }

    res.status(status).json({
      success: false,
      error: message,
      message: error.message
    });
  }
}

export default allowCors(handler);