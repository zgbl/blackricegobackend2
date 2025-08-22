// pages/api/testQuestions/stats.js
import connectDB from '../../../lib/mongodb';
import TestQuestion from '../../../models/TestQuestion';
import withCors from '../withCors';

async function handler(req, res) {
  console.log('\n=== testQuestions/stats API 调用 ===');
  console.log('时间:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  try {
    await connectDB();
    console.log('✓ 数据库连接成功');
  } catch (dbError) {
    console.error('✗ 数据库连接失败:', dbError);
    return res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: dbError.message
    });
  }

  if (req.method === 'GET') {
    return await getTestQuestionsStats(req, res);
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}

// 获取测试题统计信息
async function getTestQuestionsStats(req, res) {
  try {
    console.log('开始获取统计信息...');

    // 使用模型的静态方法获取统计信息
    const stats = await TestQuestion.getStats();
    
    console.log('✓ 统计信息获取完成:', {
      总题目数: stats.totalQuestions,
      难度分布: stats.difficultyStats,
      SGF文件数: stats.sgfStats.totalSgfFiles
    });

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('✗ 获取统计信息失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

export default withCors(handler);