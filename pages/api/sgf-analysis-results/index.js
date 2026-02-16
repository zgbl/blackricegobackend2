// pages/api/sgf-analysis-results/index.js
import connectDB from '../../../lib/mongodb';
import SGFAnalysisResult from '../../../models/SGFAnalysisResult';
import withCors from '../withCors';

async function handler(req, res) {
  await connectDB();

  switch (req.method) {
    case 'GET':
      return await getSGFAnalysisResults(req, res);
    case 'POST':
      return await createSGFAnalysisResult(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// 获取 SGF 分析结果列表
async function getSGFAnalysisResults(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      hash,
      includeDetails
    } = req.query;

    const query = {};

    // 筛选条件
    if (status) query['metadata.analysisStatus'] = status;
    if (hash) query['sgf.hash'] = hash;

    // 搜索功能
    if (search) {
      query.$or = [
        { 'sgf.filename': { $regex: search, $options: 'i' } },
        { 'sgf.gameInfo.playerBlack': { $regex: search, $options: 'i' } },
        { 'sgf.gameInfo.playerWhite': { $regex: search, $options: 'i' } },
        { 'sgf.gameInfo.event': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let queryBuilder = SGFAnalysisResult.find(query)
      .sort({ 'metadata.createdAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 如果不包含详情，则排除大字段
    if (includeDetails !== 'true') {
      queryBuilder = queryBuilder.select('-analysisResults -sgf.content');
    }

    const results = await queryBuilder;

    const total = await SGFAnalysisResult.countDocuments(query);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取 SGF 分析结果列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分析结果列表失败',
      details: error.message
    });
  }
}

// 创建新的 SGF 分析结果
async function createSGFAnalysisResult(req, res) {
  try {
    const {
      sgf,
      analysisConfig,
      analysisResults,
      metadata
    } = req.body;

    // 验证必需字段
    if (!sgf || !sgf.content || !analysisConfig || !analysisResults) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: sgf.content, analysisConfig, analysisResults'
      });
    }

    // 生成 SGF 内容的哈希值
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(sgf.content).digest('hex');

    // 检查是否已存在相同的分析结果
    const existingResult = await SGFAnalysisResult.findByHash(hash);
    if (existingResult) {
      return res.status(409).json({
        success: false,
        error: '该 SGF 文件的分析结果已存在',
        data: { id: existingResult._id, hash }
      });
    }

    // 创建新的分析结果
    const analysisResult = new SGFAnalysisResult({
      sgf: {
        ...sgf,
        hash,
        uploadTime: sgf.uploadTime || new Date()
      },
      analysisConfig: {
        ...analysisConfig,
        analysisDate: analysisConfig.analysisDate || new Date()
      },
      analysisResults,
      metadata: {
        ...metadata,
        analysisStatus: 'completed'
      }
    });

    await analysisResult.save();

    res.status(201).json({
      success: true,
      data: analysisResult,
      message: 'SGF 分析结果保存成功'
    });
  } catch (error) {
    console.error('创建 SGF 分析结果失败:', error);

    // 处理重复键错误
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: '该 SGF 文件的分析结果已存在'
      });
    }

    res.status(500).json({
      success: false,
      error: '保存分析结果失败',
      details: error.message
    });
  }
}

export default withCors(handler);