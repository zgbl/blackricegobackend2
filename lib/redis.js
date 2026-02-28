// lib/redis.js
// Redis 连接单例，供 Bull Queue 使用
// 使用 ioredis 而不是 redis 包，因为 Bull 要求 ioredis

import Redis from 'ioredis';

let redis = null;

function getRedisClient() {
    if (redis) return redis;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Bull 要求这个设置为 null
        enableReadyCheck: false,    // 避免 Bull 启动时的 ready check 超时
        lazyConnect: true,
    });

    redis.on('connect', () => {
        console.log('[Redis] 连接成功');
    });

    redis.on('error', (err) => {
        console.error('[Redis] 连接错误:', err.message);
    });

    return redis;
}

export default getRedisClient;
