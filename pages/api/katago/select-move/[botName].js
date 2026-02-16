import allowCors from '../../withCors';

async function handler(req, res) {
    const { botName } = req.query;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const katagoServerUrl = 'http://192.168.0.249:8080';

        // Construct the target URL
        const targetUrl = `${katagoServerUrl}/select-move/${botName}`;

        const controller = new AbortController();
        // Use a longer timeout for analysis
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        // Forward the request body as-is
        const response = await fetch(targetUrl, {
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
        console.error('KataGo proxy error:', error);

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
