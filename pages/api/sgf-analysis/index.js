// pages/api/sgf-analysis/index.js
import connectDB from '../../../lib/mongodb';
import SGFAnalysis from '../../../models/SGFAnalysis';
import withCors from '../withCors';

async function handler(req, res) {
  await connectDB();

  switch (req.method) {
    case 'GET':
      return await getSGFAnalyses(req, res);
    case 'POST':
      return await createSGFAnalysis(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// 获取 SGF 分析列表
async function getSGFAnalyses(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      userId, 
      status, 
      isPublic,
      search 
    } = req.query;

    const query = {};
    
    // 筛选条件
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    // 搜索功能
    if (search) {
      query.$or = [
        { 'sgfInfo.originalName': { $regex: search, $options: 'i' } },
        { 'gameInfo.blackPlayer': { $regex: search, $options: 'i' } },
        { 'gameInfo.whitePlayer': { $regex: search, $options: 'i' } },
        { 'gameInfo.event': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const analyses = await SGFAnalysis.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username')
      .select('-moveAnalyses'); // 列表不返回详细分析数据

    const total = await SGFAnalysis.countDocuments(query);

    res.status(200).json({
      success: true,
      data: analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取 SGF 分析列表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取分析列表失败',
      details: error.message 
    });
  }
}

// 创建新的 SGF 分析记录
async function createSGFAnalysis(req, res) {
  try {
    const {
      sgfInfo,
      gameInfo,
      analysisConfig,
      moveAnalyses,
      userId,
      username,
      isPublic = false,
      tags = [],
      notes = ''
    } = req.body;

    // 验证必需字段
    if (!sgfInfo || !analysisConfig || !moveAnalyses) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: sgfInfo, analysisConfig, moveAnalyses'
      });
    }

    // 创建新的分析记录
    const analysis = new SGFAnalysis({
      sgfInfo,
      gameInfo: gameInfo || {},
      analysisConfig,
      moveAnalyses,
      userId: userId || null,
      username: username || 'Anonymous',
      status: 'completed',
      isPublic,
      tags,
      notes
    });

    // 计算统计信息
    analysis.calculateStatistics();

    await analysis.save();

    res.status(201).json({
      success: true,
      data: analysis,
      message: 'SGF 分析结果保存成功'
    });
  } catch (error) {
    console.error('创建 SGF 分析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '保存分析结果失败',
      details: error.message 
    });
  }
}

export default withCors(handler);