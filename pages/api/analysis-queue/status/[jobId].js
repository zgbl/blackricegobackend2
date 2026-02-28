// pages/api/analysis-queue/status/[jobId].js
// 查询分析 Job 状态（前端轮询用）
// GET /api/analysis-queue/status/[jobId]
// 返回: { status, queuePosition, progress, analysisId, result }

import { getAnalysisQueue, getQueueStats } from '../../../../lib/analysisQueue';
import connectDB from '../../../../lib/mongodb';
import SGFAnalysis from '../../../../models/SGFAnalysis';
import withCors from '../../withCors';

async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({ success: false, error: '缺少 jobId 参数' });
    }

    try {
        // 1. 从 Bull 获取 Job 状态
        const queue = getAnalysisQueue();
        const job = await queue.getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: `Job ${jobId} 不存在`,
            });
        }

        const bullState = await job.getState(); // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
        const progress = job.progress();        // 0-100

        // 2. 计算队列排位（只对 waiting 状态有意义）
        let queuePosition = null;
        if (bullState === 'waiting') {
            const waitingJobs = await queue.getWaiting();
            const idx = waitingJobs.findIndex(j => j.id === job.id);
            queuePosition = idx >= 0 ? idx + 1 : null;
        }

        // 3. 从 MongoDB 获取分析记录（包含结果数据）
        await connectDB();
        const analysis = await SGFAnalysis.findOne({ jobId: jobId.toString() })
            .select('status analysisProgress katagoResults moveAnalyses errorMessage sgfInfo gameInfo createdAt completedAt');

        // 4. 映射状态
        const statusMap = {
            waiting: 'pending',
            active: 'analyzing',
            completed: 'completed',
            failed: 'failed',
            delayed: 'pending',
        };

        const stats = await getQueueStats();

        return res.status(200).json({
            success: true,
            data: {
                jobId,
                bullState,
                status: statusMap[bullState] || bullState,
                progress: Math.round(typeof progress === 'number' ? progress : 0),
                queuePosition,
                queueStats: stats,
                analysisId: analysis ? analysis._id.toString() : null,
                // 结果数据（仅 completed 时有）
                result: (bullState === 'completed' || bullState === 'active') && analysis ? {
                    katagoResults: analysis.katagoResults,
                    moveAnalyses: analysis.moveAnalyses,
                    sgfInfo: analysis.sgfInfo,
                    gameInfo: analysis.gameInfo,
                    completedAt: analysis.completedAt,
                } : null,
                // 错误信息（仅 failed 时有）
                error: bullState === 'failed' ? (job.failedReason || analysis?.errorMessage) : null,
            },
        });

    } catch (error) {
        console.error(`[status] 查询 Job ${jobId} 失败:`, error);
        return res.status(500).json({
            success: false,
            error: '查询任务状态失败',
            details: error.message,
        });
    }
}

export default withCors(handler);
