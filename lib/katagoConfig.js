// lib/katagoConfig.js
// Shared utility for KataGo server discovery

const PROD_TUNNEL_URL = 'https://katagoengine-lb.blackrice.top';
const DEV_LB_URL = 'http://192.168.0.162:8060';
const LB_DETECT_TIMEOUT_MS = 2000;

let _cachedUrl = null;
let _detecting = false;
let _detectPromise = null;

/**
 * 自动检测并返回最合适的 KataGo 服务器地址
 * 1. 如果在 Vercel 环境，直接使用 Cloudflare Tunnel
 * 2. 如果在本地环境，优先尝试 192.168.0.162:8060 (Nginx LB)
 * 3. 以上均不可达则回退到环境变量
 */
export async function getKatagoUrl() {
    // 🔥 增强：由于 Vercel 的 NODE_ENV 检查有时不可靠，我们直接检查环境变量
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL;
    const isProd = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';

    if (isVercel || isProd) {
        console.log(`🚀 [KataGo/Discovery] 检测到生产环境 (Vercel=${isVercel}, Prod=${isProd}) → 强制使用 Tunnel: ${PROD_TUNNEL_URL}`);
        return PROD_TUNNEL_URL;
    }

    if (_cachedUrl !== null) return _cachedUrl;
    if (_detecting) return _detectPromise;

    _detecting = true;
    _detectPromise = (async () => {
        const fallback = process.env.KATAGO_API_URL || 'http://192.168.0.162:8080';
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), LB_DETECT_TIMEOUT_MS);

            console.log(`🔍 [KataGo/Discovery] 正在探测本地 LB: ${DEV_LB_URL}...`);
            // 尝试访问本地健康检查接口
            const res = await fetch(`${DEV_LB_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(tid);

            if (res.ok || res.status < 500) {
                console.log(`🔍 [KataGo/Discovery] Dev LB 可达 → 使用 ${DEV_LB_URL}`);
                _cachedUrl = DEV_LB_URL;
            } else {
                console.warn(`🔍 [KataGo/Discovery] Dev LB 返回 ${res.status} → 回退到 ${fallback}`);
                _cachedUrl = fallback;
            }
        } catch (e) {
            console.warn(`🔍 [KataGo/Discovery] 本地 LB 不可达 (${e.message}) → 回退到 ${fallback}`);
            _cachedUrl = fallback;
        }
        _detecting = false;
        return _cachedUrl;
    })();

    return _detectPromise;
}

/**
 * 导出预置的透传 Header 名
 */
export const PASSTHROUGH_HEADERS = [
    'x-sgf-hash',
    'x-game-hash',
    'x-target-server'
];
