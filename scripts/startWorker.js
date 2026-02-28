#!/usr/bin/env node
// scripts/startWorker.js
// 独立 Worker 进程启动脚本
// 运行方式: node scripts/startWorker.js
//
// 这个脚本单独运行，不依赖 Next.js dev server。
// 它会连接 Redis，等待队列中的分析任务，串行处理每一个。
//
// 生产环境建议用 PM2 管理:
//   pm2 start scripts/startWorker.js --name katago-worker

import { getAnalysisQueue } from '../lib/analysisQueue.js';

// 初始化并启动 Worker (显式开启 worker 模式)
getAnalysisQueue({ startWorker: true, concurrency: 1 });

console.log('╔════════════════════════════════════════╗');
console.log('║   KataGo Analysis Worker 启动中...     ║');
console.log('╚════════════════════════════════════════╝');
console.log(`REDIS_URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log(`KATAGO_API_URL: ${process.env.KATAGO_API_URL || 'http://localhost:8081'}`);
console.log('');
console.log('Worker 已就绪，等待分析任务...');
console.log('按 Ctrl+C 停止');

// 优雅退出
process.on('SIGINT', async () => {
    console.log('\n[Worker] 收到 SIGINT，正在关闭...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Worker] 收到 SIGTERM，正在关闭...');
    process.exit(0);
});
