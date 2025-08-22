// pages/api/testQuestions/[id].js
import connectDB from '../../../lib/mongodb';
import TestQuestion from '../../../models/TestQuestion';
import withCors from '../withCors';

async function handler(req, res) {
  console.log('\n=== testQuestions/[id] API 调用 ===');
  console.log('时间:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('ID参数:', req.query.id);

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

  const { id } = req.query;

  if (req.method === 'GET') {
    return await getTestQuestionById(req, res, id);
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}

// 获取单个测试题详情
async function getTestQuestionById(req, res, id) {
  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '测试题ID是必需的'
      });
    }

    console.log(`查找测试题: ${id}`);

    // 根据ID查找测试题（完整数据）
    const testQuestion = await TestQuestion.findOne({ id }).lean();

    if (!testQuestion) {
      console.log(`✗ 测试题不存在: ${id}`);
      return res.status(404).json({
        success: false,
        message: '测试题不存在'
      });
    }

    console.log(`✓ 找到测试题: ${testQuestion.questionText}`);

    return res.status(200).json({
      success: true,
      data: testQuestion
    });

  } catch (error) {
    console.error('✗ 获取测试题详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

export default withCors(handler);