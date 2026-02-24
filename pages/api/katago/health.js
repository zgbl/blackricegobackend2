// pages/api/katago/health.js
import allowCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔥 修复：支持从 Header 获取目标地址
    const fallbackUrl = process.env.KATAGO_SERVER_URL || 'http://192.168.0.162:8080';
    let katagoServerUrl = req.headers['x-target-server'] || fallbackUrl;
    console.log(`🏥 Health check to: ${katagoServerUrl}/health`);
    katagoServerUrl = katagoServerUrl.replace(/\/$/, '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 增加超时到 20s

    const response = await fetch(`${katagoServerUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain, application/json',
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.text();
      res.status(200).json({
        success: true,
        status: 'healthy',
        serverUrl: katagoServerUrl,
        response: data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(response.status).json({
        success: false,
        status: 'unhealthy',
        serverUrl: katagoServerUrl,
        httpStatus: response.status,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('KataGo health check error:', error);

    let status = 'unreachable';
    if (error.name === 'AbortError') {
      status = 'timeout';
    }

    res.status(503).json({
      success: false,
      status: status,
      error: error.message,
      serverUrl: katagoServerUrl || 'http://192.168.0.162:8080',
      timestamp: new Date().toISOString()
    });
  }
}

export default allowCors(handler);