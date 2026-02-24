import allowCors from '../withCors';

/**
 * 通用 KataGo 代理接口
 * 能够处理所有发送到 /api/katago/* 的请求，并转发到指定的 KataGo 服务器
 */
async function handler(req, res) {
    const { path } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // 默认目标地址 (从环境变量获取)
    const fallbackUrl = process.env.KATAGO_SERVER_URL || 'http://192.168.0.162:8080';
    let katagoServerUrl = req.headers['x-target-server'] || fallbackUrl;
    katagoServerUrl = katagoServerUrl.replace(/\/$/, '');

    const targetUrl = `${katagoServerUrl}/${pathStr}`;

    console.log(`📡 Catch-all Proxy [${req.method}]: ${targetUrl}`);

    try {
        const controller = new AbortController();
        // 根据请求类型设置不同的超时
        const timeoutMs = pathStr.includes('select-move') || pathStr.includes('analyze') ? 60000 : 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions = {
            method: req.method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': req.headers['user-agent'] || 'SGF-Analysis-Proxy'
            },
            signal: controller.signal
        };

        // 如果是 POST 请求，转发 body
        if (req.method === 'POST' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);

        const data = await response.text();

        // 转发响应头
        res.status(response.status);

        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch {
            res.send(data);
        }

    } catch (error) {
        console.error(`❌ Proxy Error [${pathStr}]:`, error);

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
