import allowCors from '../withCors';
import { getKatagoUrl } from '../../../lib/katagoConfig';

/**
 * 通用 KataGo 代理接口
 * 能够处理所有发送到 /api/katago/* 的请求，并转发到 KataGo 服务器
 *
 * 通过 getKatagoUrl() 自动发现最合适的后端（优先 Nginx LB）
 * 通过 X-SGF-Hash 请求头实现 session sticky（同一棋谱→同一 KataGo container）
 */

async function handler(req, res) {
    const { path } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // 允许通过 x-target-server 手动覆盖目标（方便调试）
    let katagoServerUrl;
    if (req.headers['x-target-server']) {
        katagoServerUrl = req.headers['x-target-server'].replace(/\/$/, '');
        console.log(`📡 [KataGo] 手动覆盖目标: ${katagoServerUrl}`);
    } else {
        katagoServerUrl = (await getKatagoUrl()).replace(/\/$/, '');
    }

    const targetUrl = `${katagoServerUrl}/${pathStr}`;

    // 读取 Hash（优先使用 X-Game-Hash 以匹配 Nginx 预期，兼容旧的 X-SGF-Hash）
    const sgfHash = req.headers['x-game-hash'] || req.headers['X-Game-Hash'] ||
        req.headers['x-sgf-hash'] || req.headers['X-SGF-Hash'] || '';

    if (sgfHash) {
        console.log(`🔗 [KataGo] Proxy [${req.method}] (Sticky: ${sgfHash}): ${targetUrl}`);
    } else {
        console.log(`📡 [KataGo] Proxy [${req.method}]: ${targetUrl}`);
    }

    try {
        const controller = new AbortController();
        const timeoutMs = (pathStr.includes('select-move') || pathStr.includes('analyze'))
            ? 120000
            : 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 构建上游请求头
        const upstreamHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': req.headers['user-agent'] || 'SGF-Analysis-Proxy',
        };

        // 透传 X-Game-Hash 和 X-SGF-Hash → nginx LB 使用这些 header 做 session sticky
        if (sgfHash) {
            upstreamHeaders['X-Game-Hash'] = sgfHash;
            upstreamHeaders['X-SGF-Hash'] = sgfHash;
        }

        const fetchOptions = {
            method: req.method,
            headers: upstreamHeaders,
            signal: controller.signal
        };

        if (req.method === 'POST' && req.body) {
            fetchOptions.body = typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);

        const data = await response.text();
        res.status(response.status);

        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch {
            res.send(data);
        }

    } catch (error) {
        console.error(`❌ [KataGo] Proxy Error [${pathStr}]:`, error);

        let status = 503;
        let message = 'Failed to connect to KataGo server via proxy';

        if (error.name === 'AbortError') {
            status = 408;
            message = 'Request timeout';
        }

        res.status(status).json({
            success: false,
            error: message,
            message: error.message,
            targetUrl: targetUrl
        });
    }
}

export default allowCors(handler);
