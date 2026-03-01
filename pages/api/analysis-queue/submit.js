// pages/api/analysis-queue/submit.js
// 提交 SGF 分析任务到 Bull Queue
// POST /api/analysis-queue/submit

import connectDB from '../../../lib/mongodb';
import SGFAnalysis from '../../../models/SGFAnalysis';
import { submitAnalysisJob } from '../../../lib/analysisQueue';
import withCors from '../withCors';

async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    await connectDB();

    try {
        const {
            // SGF 基本信息
            sgfContent,
            sgfInfo,
            gameInfo,
            // 分析配置
            moves,         // [['B', 'Q16'], ['W', 'D16'], ...]
            boardSize = 19,
            maxVisits = 500,
            komi = 7.5,
            analyzeTurns,  // 可选：[1, 2, 3, ...] 指定分析哪些步骤，默认分析最后一步
            // 用户信息
            userId,
            username = 'Anonymous',
            isPublic = false,
            tags = [],
            notes = '',
        } = req.body;

        // 验证必填字段
        if (!moves || !Array.isArray(moves)) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段: moves（走法数组）',
            });
        }

        if (!sgfInfo) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段: sgfInfo',
            });
        }

        // 构建 analyzeTurns（如果未指定，默认分析所有步骤）
        const turnsToAnalyze = analyzeTurns || Array.from({ length: moves.length }, (_, i) => i + 1);

        // 1. 在 MongoDB 创建 pending 记录
        const analysis = new SGFAnalysis({
            sgfInfo: {
                filename: sgfInfo.filename || `sgf_${Date.now()}.sgf`,
                originalName: sgfInfo.originalName || sgfInfo.filename || 'unknown.sgf',
                fileSize: sgfInfo.fileSize || (sgfContent ? sgfContent.length : 0),
                uploadPath: sgfInfo.uploadPath || undefined,
            },
            gameInfo: gameInfo || {},
            analysisConfig: {
                katagoVersion: 'analysis',
                modelName: process.env.KATAGO_MODEL_NAME || 'kata1-b40c256-s11840935168',
                maxVisits,
                startMove: 1,
                endMove: moves.length,
            },
            moveAnalyses: [],  // 分析完成后由 Worker 填充
            statistics: {
                totalMoves: moves.length,
                analyzedMoves: 0,
                averageWinrate: { black: 0, white: 0 },
                totalAnalysisTime: 0,
            },
            userId: userId || null,
            username,
            status: 'pending',
            analysisProgress: 0,
            isPublic,
            tags,
            notes,
        });

        await analysis.save();

        // 2. 提交 Job 到 Bull Queue
        const job = await submitAnalysisJob(analysis._id.toString(), {
            moves,
            boardSize,
            maxVisits,
            komi,
            analyzeTurns: turnsToAnalyze,
        });

        // 3. 把 jobId 写回 MongoDB（方便后续查询）
        await SGFAnalysis.findByIdAndUpdate(analysis._id, { jobId: job.id.toString() });

        // 4. 获取当前队列排位
        const job_obj = await getJobQueuePosition(job);

        return res.status(201).json({
            success: true,
            data: {
                jobId: job.id.toString(),
                analysisId: analysis._id.toString(),
                status: 'pending',
                queuePosition: job_obj.position,
                totalInQueue: job_obj.total,
                estimatedWaitSeconds: job_obj.position * 60, // 粗略估计，每步约60秒
            },
            message: '分析任务已提交，请用 jobId 查询进度',
        });

    } catch (error) {
        console.error('[submit] 提交分析任务失败:', error);
        return res.status(500).json({
            success: false,
            error: '提交分析任务失败',
            details: error.message,
        });
    }
}

async function getJobQueuePosition(job) {
    try {
        const queue = job.queue;
        const waitingJobs = await queue.getWaiting();
        const position = waitingJobs.findIndex(j => j.id === job.id) + 1;
        return {
            position: position > 0 ? position : 1,
            total: waitingJobs.length,
        };
    } catch {
        return { position: 1, total: 1 };
    }
}

export default withCors(handler);
