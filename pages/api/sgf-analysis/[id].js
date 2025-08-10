// pages/api/sgf-analysis/[id].js
import connectDB from '../../../lib/mongodb';
import SGFAnalysis from '../../../models/SGFAnalysis';
import withCors from '../withCors';

async function handler(req, res) {
  await connectDB();

  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return await getSGFAnalysis(req, res, id);
    case 'PUT':
      return await updateSGFAnalysis(req, res, id);
    case 'DELETE':
      return await deleteSGFAnalysis(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// 获取单个 SGF 分析详情
async function getSGFAnalysis(req, res, id) {
  try {
    const analysis = await SGFAnalysis.findById(id)
      .populate('userId', 'username email');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析记录不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('获取 SGF 分析详情失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取分析详情失败',
      details: error.message 
    });
  }
}

// 更新 SGF 分析
async function updateSGFAnalysis(req, res, id) {
  try {
    const updates = req.body;
    
    // 不允许更新的字段
    delete updates._id;
    delete updates.createdAt;
    delete updates.sgfInfo;
    delete updates.moveAnalyses;

    const analysis = await SGFAnalysis.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析记录不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: analysis,
      message: '分析记录更新成功'
    });
  } catch (error) {
    console.error('更新 SGF 分析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '更新分析记录失败',
      details: error.message 
    });
  }
}

// 删除 SGF 分析
async function deleteSGFAnalysis(req, res, id) {
  try {
    const analysis = await SGFAnalysis.findByIdAndDelete(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析记录不存在'
      });
    }

    res.status(200).json({
      success: true,
      message: '分析记录删除成功'
    });
  } catch (error) {
    console.error('删除 SGF 分析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '删除分析记录失败',
      details: error.message 
    });
  }
}

export default withCors(handler);