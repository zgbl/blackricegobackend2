// pages/api/testQuestions/sgf/[sgfHash].js
import connectDB from '../../../../lib/mongodb';
import TestQuestion from '../../../../models/TestQuestion';
import withCors from '../../withCors';

async function handler(req, res) {
  console.log('\n=== testQuestions/sgf/[sgfHash] API 调用 ===');
  console.log('时间:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('SGF Hash:', req.query.sgfHash);

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

  const { sgfHash } = req.query;

  if (req.method === 'DELETE') {
    return await deleteTestQuestionsBySgfHash(req, res, sgfHash);
  } else {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}

// 删除指定SGF的所有测试题
async function deleteTestQuestionsBySgfHash(req, res, sgfHash) {
  try {
    if (!sgfHash) {
      return res.status(400).json({
        success: false,
        message: 'SGF哈希值是必需的'
      });
    }

    console.log(`准备删除SGF ${sgfHash} 的所有测试题`);

    // 先查询要删除的测试题数量
    const countToDelete = await TestQuestion.countDocuments({ sgfHash });
    console.log(`找到 ${countToDelete} 个测试题需要删除`);

    if (countToDelete === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到相关的测试题'
      });
    }

    // 执行删除操作
    const deleteResult = await TestQuestion.deleteMany({ sgfHash });
    
    console.log(`✓ 删除完成: ${deleteResult.deletedCount} 个测试题`);

    return res.status(200).json({
      success: true,
      message: '删除成功',
      data: {
        deletedCount: deleteResult.deletedCount
      }
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