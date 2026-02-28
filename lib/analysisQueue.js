// lib/analysisQueue.js
// Bull Queue 核心：队列定义 + Worker 处理逻辑
// concurrency=1 保证 KataGo 分析是串行的，不会并发竞争

import Bull from 'bull';
import connectDB from './mongodb.js';
import SGFAnalysis from '../models/SGFAnalysis.js';

const KATAGO_API_URL = process.env.KATAGO_API_URL || 'http://localhost:8081';

// ─── 队列单例 ────────────────────────────────────────────────────────────────

/**
 * 获取队列单例
 * @param {Object} options 
 * @param {boolean} options.startWorker 是否启动内置 Worker (默认 false)
 * @param {number} options.concurrency Worker 并发数 (默认 1)
 */
export function getAnalysisQueue(options = { startWorker: false, concurrency: 1 }) {
    if (analysisQueue) {
        // 如果已经初始化过，且这次要求启动 Worker 而之前没启动，则补救一下
        if (options.startWorker && !workerStarted) {
            console.log(`[Queue] 在已存在队列上追加启动 Worker (concurrency=${options.concurrency})`);
            analysisQueue.process(options.concurrency || 1, processAnalysisJob);
            workerStarted = true;
        }
        return analysisQueue;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[Queue] 初始化队列: ${redisUrl}`);

    analysisQueue = new Bull('katago-analysis', redisUrl, {
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'fixed', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
        },
    });

    if (options.startWorker) {
        console.log(`[Queue] 启动 Worker 处理函数 (concurrency=${options.concurrency})`);
        analysisQueue.process(options.concurrency || 1, processAnalysisJob);
        workerStarted = true;
    }

    analysisQueue.on('completed', (job) => {
        console.log(`[Queue] Job ${job.id} 完成`);
    });

    // ... rest of event listeners ...

    analysisQueue.on('failed', (job, err) => {
        console.error(`[Queue] Job ${job.id} 失败:`, err.message);
    });

    analysisQueue.on('stalled', (job) => {
        console.warn(`[Queue] Job ${job.id} stalled，将重新处理`);
    });

    return analysisQueue;
}

// ─── Worker 处理函数 ─────────────────────────────────────────────────────────

/**
 * 处理单个分析 Job
 * job.data 包含：{ analysisId, moves, boardSize, maxVisits, komi, analyzeTurns }
 */
async function processAnalysisJob(job) {
    const { analysisId, moves, boardSize, maxVisits, komi, analyzeTurns } = job.data;

    console.log(`[Worker] 开始处理 Job ${job.id}, analysisId=${analysisId}`);

    await connectDB();

    // 1. 更新状态为 analyzing
    await SGFAnalysis.findByIdAndUpdate(analysisId, {
        status: 'analyzing',
        analysisProgress: 0,
        updatedAt: new Date(),
    });

    try {
        if (!moves || moves.length === 0) {
            throw new Error('No moves provided for analysis');
        }

        const totalSteps = analyzeTurns ? analyzeTurns.length : 1;
        const allResults = [];
        console.log(`[Worker] Job ${job.id} 计划分析 ${totalSteps} 步...`);

        // 2. 逐步分析（每个 analyzeTurn 一次 KataGo 请求）
        for (let i = 0; i < totalSteps; i++) {
            const currentTurn = analyzeTurns ? analyzeTurns[i] : moves.length;
            const movesUpToTurn = analyzeTurns ? moves.slice(0, currentTurn) : moves;

            // 进度更新
            const progress = Math.round(((i + 1) / totalSteps) * 100);
            await job.progress(progress);

            // 调用 KataGo
            const response = await fetch(`${KATAGO_API_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    board_size: boardSize,
                    moves: movesUpToTurn,
                    config: { maxVisits: maxVisits || 500, komi: komi || 7.5 },
                }),
                signal: AbortSignal.timeout(90000), // 90秒超时
            });

            if (!response.ok) {
                throw new Error(`KataGo 返回错误: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.error) {
                console.error(`[Worker] KataGo 分析出错 (Turn ${currentTurn}):`, result.error);
                throw new Error(`KataGo 分析错误: ${result.error}`);
            }

            // 3. 解析并保存单步结果到 moveAnalyses 数组
            const parsedMove = parseKataGoResult(result, currentTurn, moves, boardSize);

            // 调试：记录解析结果
            console.log(`[Worker] Step ${i + 1}/${totalSteps} 完成: Turn ${currentTurn} (${parsedMove.player})`);

            // 实时将解析结果推送到 MongoDB，以便前端轮询
            await SGFAnalysis.findByIdAndUpdate(analysisId, {
                $push: { moveAnalyses: parsedMove },
                analysisProgress: progress,
                updatedAt: new Date(),
            });

            allResults.push({ turn: currentTurn, data: result });
        }

        // 4. 分析完成，计算统计信息并保存
        const finalAnalysis = await SGFAnalysis.findById(analysisId);
        if (finalAnalysis) {
            finalAnalysis.status = 'completed';
            finalAnalysis.analysisProgress = 100;
            finalAnalysis.katagoResults = allResults;
            finalAnalysis.calculateStatistics(); // 调用模型内置的统计方法
            await finalAnalysis.save();
        }

        console.log(`[Worker] Job ${job.id} 完成，共 ${totalSteps} 步`);
        return { success: true, steps: totalSteps };

    } catch (err) {
        console.error(`[Worker] Job ${job.id} 处理失败:`, err.message);

        // 4. 写入失败状态
        await SGFAnalysis.findByIdAndUpdate(analysisId, {
            status: 'failed',
            errorMessage: err.message,
            updatedAt: new Date(),
        });

        throw err; // 让 Bull 记录失败并触发重试
    }
}

/**
 * 将 KataGo 原始 JSON 解析为 SGFAnalysis 模型需要的 MoveAnalysis 结构
 */
function parseKataGoResult(rawData, moveNumber, moves, boardSize) {
    const rootInfo = rawData.rootInfo || {};
    const moveInfos = rawData.moveInfos || [];

    // 1. 获取当前走法信息
    if (moveNumber > moves.length || moveNumber < 1) {
        console.warn(`[Worker] moveNumber ${moveNumber} 出越界 (moves.length=${moves.length})`);
    }
    const currentMove = moves[moveNumber - 1] || ['B', 'pass']; // 格式: ['B', 'Q16']
    const player = (currentMove[0].toUpperCase() === 'B') ? 'black' : 'white';

    // 2. 解析坐标
    const pos = parseKataGoCoord(currentMove[1], boardSize);

    // 3. 归一化分析结果
    const evaluation = {
        winrate: rootInfo.winrate || 0,
        score: rootInfo.scoreMean || 0,
        visits: rootInfo.visits || 0
    };

    // 4. 解析候选变化
    const suggestions = moveInfos.slice(0, 10).map((info, idx) => {
        const suggPos = parseKataGoCoord(info.move, boardSize);
        return {
            move: suggPos,
            winrate: info.winrate || 0,
            score: info.scoreMean || 0,
            visits: info.visits || 0,
            pv: info.pv || [],
            order: idx
        };
    });

    return {
        moveNumber,
        player,
        position: pos,
        analysis: {
            suggestions,
            evaluation,
            analysisTime: rawData.analysis_time || 0,
            isBestMove: suggestions.length > 0 && suggestions[0].move.row === pos.row && suggestions[0].move.col === pos.col,
            scoreLoss: 0 // 平滑逻辑可以在 calculateStatistics 中处理
        },
        analyzedAt: new Date()
    };
}

/**
 * 将 KataGo 坐标 (如 "Q16") 转换为 {row, col}
 */
function parseKataGoCoord(coord, boardSize) {
    if (!coord || coord.toUpperCase() === 'PASS') return { row: -1, col: -1 };

    const colStr = coord[0].toUpperCase();
    const rowStr = coord.slice(1);

    // 跳过 'I'
    let col = colStr.charCodeAt(0) - 65;
    if (colStr > 'I') col -= 1;

    const row = boardSize - parseInt(rowStr);

    return { row, col };
}

// ─── 提交 Job ────────────────────────────────────────────────────────────────

/**
 * 提交分析任务到队列
 * @returns { job } Bull Job 对象
 */
export async function submitAnalysisJob(analysisId, jobData) {
    const queue = getAnalysisQueue({ startWorker: false }); // 提交端不启动 Worker
    const job = await queue.add({ analysisId, ...jobData });
    console.log(`[Queue] Job ${job.id} 已入队, analysisId=${analysisId}`);
    return job;
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats() {
    const queue = getAnalysisQueue();
    const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
}
