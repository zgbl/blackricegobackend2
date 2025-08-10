// pages/api/sgf-analysis/batch.js
import connectDB from '../../../lib/mongodb';
import SGFAnalysis from '../../../models/SGFAnalysis';
import withCors from '../withCors';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  await connectDB();

  try {
    const { analyses } = req.body;

    if (!Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的分析数据数组'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < analyses.length; i++) {
      try {
        const analysisData = analyses[i];
        
        // 验证必需字段
        if (!analysisData.sgfInfo || !analysisData.analysisConfig || !analysisData.moveAnalyses) {
          errors.push({
            index: i,
            error: '缺少必需字段: sgfInfo, analysisConfig, moveAnalyses'
          });
          continue;
        }

        // 创建新的分析记录
        const analysis = new SGFAnalysis({
          sgfInfo: analysisData.sgfInfo,
          gameInfo: analysisData.gameInfo || {},
          analysisConfig: analysisData.analysisConfig,
          moveAnalyses: analysisData.moveAnalyses,
          userId: analysisData.userId || null,
          username: analysisData.username || 'Anonymous',
          status: 'completed',
          isPublic: analysisData.isPublic || false,
          tags: analysisData.tags || [],
          notes: analysisData.notes || ''
        });

        // 计算统计信息
        analysis.calculateStatistics();

        await analysis.save();
        results.push({
          index: i,
          id: analysis._id,
          success: true
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        processed: analyses.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: `批量保存完成: ${results.length} 成功, ${errors.length} 失败`
    });
  } catch (error) {
    console.error('批量保存 SGF 分析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '批量保存失败',
      details: error.message 
    });
  }
}

export default withCors(handler);