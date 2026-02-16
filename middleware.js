import { NextResponse } from 'next/server';

const allowedOrigins = [
  'http://weiqi.blackrice.top',    // 开发阶段可能从HTTP访问
  'http://forum.blackrice.top',    // 开发阶段可能从HTTP访问
  'https://weiqi.blackrice.top',   // 生产环境通过HTTPS访问
  'https://forum.blackrice.top',   // 生产环境通过HTTPS访问
  'https://zgbl.github.io',        // GitHub Pages
  'http://localhost:3000',         // 本地开发环境
  'https://localhost:3000',        // 本地开发 HTTPS
  'http://localhost:8090',         // 前端测试端口
  'https://localhost:8090',         // 前端测试端口 HTTPS
  'http://localhost:8000'          // python server 默认端口
];

export function middleware(request) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // 设置 CORS 头部
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // 检查origin是否在允许列表中 - 🔥 Modified to allow all origins
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/forum/:path*',
    '/select-move/:path*', // 🔥 Added for KataGo direct compatibility
    '/health',            // 🔥 Added for health check
    '/_next/static/:path*'  // 添加静态资源支持
  ],
};