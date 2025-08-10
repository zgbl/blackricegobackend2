// pages/api/katago/test.js
import allowCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const katagoServerUrl = 'http://192.168.0.249:8080';
  const testResults = {
    serverUrl: katagoServerUrl,
    timestamp: new Date().toISOString(),
    tests: []
  };

  // 测试 1: 基本连接
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(katagoServerUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    testResults.tests.push({
      name: 'Basic Connection',
      status: 'success',
      httpStatus: response.status,
      message: 'Server is reachable'
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Basic Connection',
      status: 'failed',
      error: error.message
    });
  }

  // 测试 2: Health 端点
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${katagoServerUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    testResults.tests.push({
      name: 'Health Endpoint',
      status: response.ok ? 'success' : 'warning',
      httpStatus: response.status,
      message: response.ok ? 'Health endpoint accessible' : 'Health endpoint returned error'
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Health Endpoint',
      status: 'failed',
      error: error.message
    });
  }

  // 测试 3: 其他可能的端点
  const endpoints = ['/info', '/version', '/analyze'];
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${katagoServerUrl}${endpoint}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      testResults.tests.push({
        name: `Endpoint ${endpoint}`,
        status: response.ok ? 'success' : 'warning',
        httpStatus: response.status,
        message: response.ok ? 'Endpoint accessible' : `Endpoint returned ${response.status}`
      });
    } catch (error) {
      testResults.tests.push({
        name: `Endpoint ${endpoint}`,
        status: 'failed',
        error: error.message
      });
    }
  }

  // 计算总体状态
  const successCount = testResults.tests.filter(t => t.status === 'success').length;
  const totalTests = testResults.tests.length;
  
  testResults.summary = {
    totalTests,
    successCount,
    failedCount: testResults.tests.filter(t => t.status === 'failed').length,
    warningCount: testResults.tests.filter(t => t.status === 'warning').length,
    overallStatus: successCount > 0 ? 'partial' : 'failed'
  };

  res.status(200).json({
    success: true,
    data: testResults
  });
}

export default allowCors(handler);