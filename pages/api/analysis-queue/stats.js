// pages/api/analysis-queue/stats.js
// 队列整体统计信息
// GET /api/analysis-queue/stats

import { getAnalysisQueue, getQueueStats } from '../../../lib/analysisQueue';
import withCors from '../withCors';

async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const stats = await getQueueStats();
        const queue = getAnalysisQueue();

        // 获取当前活跃 Job 信息（给前端显示"正在分析谁"）
        const activeJobs = await queue.getActive();
        const waitingJobs = await queue.getWaiting();

        const activeInfo = activeJobs.map(j => ({
            jobId: j.id,
            analysisId: j.data.analysisId,
            progress: j.progress(),
            startedAt: j.processedOn ? new Date(j.processedOn).toISOString() : null,
        }));

        const waitingInfo = waitingJobs.map((j, idx) => ({
            jobId: j.id,
            analysisId: j.data.analysisId,
            queuePosition: idx + 1,
            addedAt: j.timestamp ? new Date(j.timestamp).toISOString() : null,
        }));

        return res.status(200).json({
            success: true,
            data: {
                stats,
                active: activeInfo,
                waiting: waitingInfo,
            },
        });
    } catch (error) {
        console.error('[stats] 获取队列统计失败:', error);
        return res.status(500).json({
            success: false,
            error: '获取队列统计失败',
            details: error.message,
        });
    }
}

export default withCors(handler);
