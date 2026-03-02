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
  } else if (req.method === 'DELETE') {
    return await deleteTestQuestionById(req, res, id);
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
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

// 删除测试题
async function deleteTestQuestionById(req, res, id) {
  try {
    if (!id) {
      return res.status(400).json({ success: false, message: '测试题ID是必需的' });
    }

    const { producer, isAdmin } = req.body; // Expect permissions info in DELETE request body

    if (!producer && !isAdmin) {
      return res.status(400).json({ success: false, message: '请提供 producer 身份，或使用管理员权限' });
    }

    console.log(`尝试删除测试题: ${id}, 制作人: ${producer}, 管理员: ${isAdmin}`);

    const testQuestion = await TestQuestion.findOne({ id }).lean();

    if (!testQuestion) {
      return res.status(404).json({ success: false, message: '测试题不存在' });
    }

    if (!isAdmin && testQuestion.producer !== producer) {
      return res.status(403).json({ success: false, message: '无权删除：只能删除自己制作的题目' });
    }

    await TestQuestion.deleteOne({ id });
    console.log(`✓ 成功删除测试题: ${id}`);

    return res.status(200).json({
      success: true,
      message: '测试题删除成功'
    });
  } catch (error) {
    console.error('✗ 删除测试题失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

export default withCors(handler);