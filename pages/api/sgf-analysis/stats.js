// pages/api/sgf-analysis/stats.js
import connectDB from '../../../lib/mongodb';
import SGFAnalysis from '../../../models/SGFAnalysis';
import withCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  await connectDB();

  try {
    const { userId, timeRange = '30d' } = req.query;

    // 计算时间范围
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const query = {
      createdAt: { $gte: startDate },
      status: 'completed'
    };

    if (userId) {
      query.userId = userId;
    }

    // 基本统计
    const totalAnalyses = await SGFAnalysis.countDocuments(query);
    const publicAnalyses = await SGFAnalysis.countDocuments({ ...query, isPublic: true });

    // 聚合统计
    const stats = await SGFAnalysis.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMoves: { $sum: '$statistics.totalMoves' },
          totalAnalysisTime: { $sum: '$statistics.totalAnalysisTime' },
          totalBlunders: { $sum: '$statistics.blunders' },
          totalMistakes: { $sum: '$statistics.mistakes' },
          totalInaccuracies: { $sum: '$statistics.inaccuracies' },
          avgBlackWinrate: { $avg: '$statistics.averageWinrate.black' },
          avgWhiteWinrate: { $avg: '$statistics.averageWinrate.white' }
        }
      }
    ]);

    // 每日分析数量趋势
    const dailyStats = await SGFAnalysis.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalMoves: { $sum: '$statistics.totalMoves' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = {
      summary: {
        totalAnalyses,
        publicAnalyses,
        timeRange,
        ...(stats[0] || {
          totalMoves: 0,
          totalAnalysisTime: 0,
          totalBlunders: 0,
          totalMistakes: 0,
          totalInaccuracies: 0,
          avgBlackWinrate: 0,
          avgWhiteWinrate: 0
        })
      },
      trends: {
        daily: dailyStats
      }
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取统计数据失败',
      details: error.message 
    });
  }
}

export default withCors(handler);