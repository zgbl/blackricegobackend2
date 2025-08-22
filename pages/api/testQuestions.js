// pages/api/testQuestions.js
import connectDB from '../../lib/mongodb';
import TestQuestion from '../../models/TestQuestion';
import withCors from './withCors';

async function handler(req, res) {
  console.log('\n=== testQuestions API 调用 ===');
  console.log('时间:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // 添加请求体日志
  if (req.method === 'POST') {
    console.log('请求体大小:', JSON.stringify(req.body).length, 'bytes');
    console.log('请求体内容:', JSON.stringify(req.body, null, 2));
  }

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

  if (req.method === 'POST') {
    return await createTestQuestions(req, res);
  } else if (req.method === 'GET') {
    return await getTestQuestions(req, res);
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}

// 批量创建测试题
async function createTestQuestions(req, res) {
  try {
    const { questions, metadata, overwrite = false } = req.body;
    
    console.log('收到创建测试题请求:');
    console.log('- questions数量:', questions?.length || 0);
    console.log('- metadata:', metadata);
    console.log('- overwrite模式:', overwrite);

    // 验证请求数据
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请求数据格式错误',
        error: 'questions字段是必需的，且必须是非空数组'
      });
    }

    console.log(`准备创建 ${questions.length} 个测试题`);

    // 在验证前添加数据预处理
    const processedQuestions = questions.map((question, index) => {
      console.log(`处理第${index + 1}个测试题:`, question.id);
      
      // 处理winRate类型转换
      const processedQuestion = { ...question };
      
      // 处理candidatePoints中的winRate
      if (processedQuestion.candidatePoints) {
        processedQuestion.candidatePoints = processedQuestion.candidatePoints.map(point => ({
          ...point,
          winRate: parseFloat(point.winRate) // 确保转换为数字
        }));
      }
      
      // 处理correctAnswer中的winRate
      if (processedQuestion.correctAnswer && processedQuestion.correctAnswer.winRate) {
        processedQuestion.correctAnswer.winRate = parseFloat(processedQuestion.correctAnswer.winRate);
      }
      
      // 处理winRateLoss
      if (processedQuestion.winRateLoss) {
        processedQuestion.winRateLoss = parseFloat(processedQuestion.winRateLoss);
      }
      
      return processedQuestion;
    });

    // 验证每个测试题的数据格式
    const validationErrors = [];
    processedQuestions.forEach((question, index) => {
      const errors = validateQuestionData(question);
      if (errors.length > 0) {
        console.log(`验证失败 - 题目${index + 1}:`, errors);
        validationErrors.push(`题目${index + 1}: ${errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: validationErrors.join('; ')
      });
    }

    // 如果是覆盖模式，先删除现有的重复测试题
    if (overwrite) {
      console.log('覆盖模式：开始删除现有测试题');
      const questionIds = processedQuestions.map(q => q.id);
      const deleteResult = await TestQuestion.deleteMany({ id: { $in: questionIds } });
      console.log(`✓ 删除了 ${deleteResult.deletedCount} 个现有测试题`);
    }

    // 批量插入，处理重复数据
    const insertedIds = [];
    const duplicateIds = [];
    const updatedIds = [];
    let insertedCount = 0;
    let duplicateCount = 0;
    let updatedCount = 0;

    for (const questionData of processedQuestions) {
      try {
        if (!overwrite) {
          // 非覆盖模式：检查是否已存在
          const existing = await TestQuestion.findOne({ id: questionData.id });
          if (existing) {
            duplicateIds.push(questionData.id);
            duplicateCount++;
            continue;
          }
        }

        // 创建新测试题
        const testQuestion = new TestQuestion({
          ...questionData,
          createdAt: questionData.createdAt ? new Date(questionData.createdAt) : new Date(),
          updatedAt: new Date()
        });

        const saved = await testQuestion.save();
        
        if (overwrite) {
          updatedIds.push(saved._id.toString());
          updatedCount++;
          console.log(`✓ 覆盖测试题: ${questionData.id}`);
        } else {
          insertedIds.push(saved._id.toString());
          insertedCount++;
          console.log(`✓ 创建测试题: ${questionData.id}`);
        }
        
      } catch (error) {
        console.error(`✗ ${overwrite ? '覆盖' : '创建'}测试题失败 ${questionData.id}:`, error.message);
        if (error.code === 11000 && !overwrite) {
          duplicateIds.push(questionData.id);
          duplicateCount++;
        } else {
          throw error;
        }
      }
    }

    if (overwrite) {
      console.log(`覆盖完成: 成功${updatedCount}个`);
      return res.status(200).json({
        success: true,
        message: '测试题覆盖成功',
        data: {
          updatedCount,
          updatedIds,
          totalProcessed: processedQuestions.length
        }
      });
    } else {
      console.log(`批量创建完成: 成功${insertedCount}个, 重复${duplicateCount}个`);

      // 根据结果返回不同的状态码
      if (insertedCount > 0 && duplicateCount === 0) {
        // 全部成功
        return res.status(200).json({
          success: true,
          message: '测试题创建成功',
          data: {
            insertedCount,
            insertedIds,
            duplicateCount: 0,
            skippedIds: []
          }
        });
      } else if (insertedCount > 0 && duplicateCount > 0) {
        // 部分成功
        return res.status(409).json({
          success: false,
          message: '部分测试题已存在',
          data: {
            insertedCount,
            insertedIds,
            duplicateCount,
            duplicateIds
          }
        });
      } else {
        // 全部重复
        return res.status(409).json({
          success: false,
          message: '所有测试题都已存在',
          data: {
            insertedCount: 0,
            duplicateCount,
            duplicateIds
          }
        });
      }
    }

  } catch (error) {
    console.error('✗ 创建测试题失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

// 获取测试题列表
async function getTestQuestions(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      sgfHash,
      difficulty,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDetails = true // 修改默认值为true，确保boardState等重要数据默认返回
    } = req.query;

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const filter = {};
    if (sgfHash) filter.sgfHash = sgfHash;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      filter.difficulty = difficulty;
    }

    // 构建排序条件
    const validSortFields = ['createdAt', 'moveNumber', 'winRateLoss', 'difficulty'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    console.log('查询条件:', filter);
    console.log('排序:', sort);
    console.log('分页:', { page: pageNum, limit: limitNum, skip });
    console.log('包含详细数据:', includeDetails);

    // 构建查询
    let query = TestQuestion.find(filter);
    
    // 根据includeDetails参数决定是否排除详细数据
    if (includeDetails === 'false' || includeDetails === false) {
      query = query.select('-boardState -candidatePoints -correctAnswer'); // 只有明确指定false才排除
      console.log('✓ 使用简化模式，排除详细数据');
    } else {
      console.log('✓ 使用完整模式，包含所有数据（包括boardState）');
    }
    
    // 执行查询
    const [questions, totalItems] = await Promise.all([
      query
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TestQuestion.countDocuments(filter)
    ]);

    // 添加详细的返回数据日志
    console.log(`✓ 查询完成: 找到${questions.length}个测试题，总计${totalItems}个`);
    
    if (questions.length > 0) {
      const firstQuestion = questions[0];
      console.log('第一个题目的数据结构:');
      console.log('- ID:', firstQuestion._id);
      console.log('- sgfHash:', firstQuestion.sgfHash);
      console.log('- moveNumber:', firstQuestion.moveNumber);
      console.log('- difficulty:', firstQuestion.difficulty);
      console.log('- 是否包含boardState:', !!firstQuestion.boardState);
      console.log('- 是否包含candidatePoints:', !!firstQuestion.candidatePoints);
      console.log('- 是否包含correctAnswer:', !!firstQuestion.correctAnswer);
      
      if (firstQuestion.boardState) {
        console.log('- boardState类型:', typeof firstQuestion.boardState);
        console.log('- boardState长度:', Array.isArray(firstQuestion.boardState) ? firstQuestion.boardState.length : 'N/A');
        if (Array.isArray(firstQuestion.boardState) && firstQuestion.boardState.length > 0) {
          console.log('- boardState[0]长度:', Array.isArray(firstQuestion.boardState[0]) ? firstQuestion.boardState[0].length : 'N/A');
        }
      }
      
      if (firstQuestion.candidatePoints) {
        console.log('- candidatePoints数量:', Array.isArray(firstQuestion.candidatePoints) ? firstQuestion.candidatePoints.length : 'N/A');
      }
    }

    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const responseData = {
      success: true,
      data: {
        questions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage
        }
      }
    };
    
    console.log('返回数据概要:');
    console.log('- questions数量:', responseData.data.questions.length);
    console.log('- 总页数:', responseData.data.pagination.totalPages);
    console.log('- 当前页:', responseData.data.pagination.currentPage);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('✗ 获取测试题列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

// 验证测试题数据格式
function validateQuestionData(question) {
  const errors = [];

  // 必需字段验证
  if (!question.id) errors.push('id字段是必需的');
  if (!question.sgfHash) errors.push('sgfHash字段是必需的');
  if (!question.sgfFilename) errors.push('sgfFilename字段是必需的');
  if (typeof question.moveNumber !== 'number' || question.moveNumber < 1) {
    errors.push('moveNumber必须是大于0的数字');
  }
  if (!question.currentPlayer || !['black', 'white'].includes(question.currentPlayer)) {
    errors.push('currentPlayer必须是"black"或"white"');
  }
  if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
    errors.push('difficulty必须是"easy"、"medium"或"hard"');
  }
  if (!question.questionText) errors.push('questionText字段是必需的');

  // 棋盘状态验证
  if (!Array.isArray(question.boardState) || question.boardState.length !== 19) {
    errors.push('boardState必须是19x19的数组');
  } else {
    const validBoard = question.boardState.every(row => 
      Array.isArray(row) && 
      row.length === 19 && 
      row.every(cell => cell === null || cell === 'black' || cell === 'white')
    );
    if (!validBoard) {
      errors.push('boardState数组中的值必须是null、"black"或"white"');
    }
  }

  // 候选点验证 - 改进winRate验证
  if (!Array.isArray(question.candidatePoints) || question.candidatePoints.length < 2) {
    errors.push('candidatePoints必须是包含至少2个元素的数组');
  } else {
    question.candidatePoints.forEach((point, index) => {
      if (!point.type || !['actual', 'best', 'alternate'].includes(point.type)) {
        errors.push(`candidatePoints[${index}].type无效`);
      }
      if (typeof point.row !== 'number' || point.row < 0 || point.row > 18) {
        errors.push(`candidatePoints[${index}].row必须是0-18的数字`);
      }
      if (typeof point.col !== 'number' || point.col < 0 || point.col > 18) {
        errors.push(`candidatePoints[${index}].col必须是0-18的数字`);
      }
      
      // 改进winRate验证 - 支持string和number
      const winRate = parseFloat(point.winRate);
      if (isNaN(winRate) || winRate < 0 || winRate > 100) {
        errors.push(`candidatePoints[${index}].winRate必须是0-100的数字，当前值: ${point.winRate}`);
      }
    });
  }

  // 正确答案验证 - 改进winRate验证
  if (!question.correctAnswer) {
    errors.push('correctAnswer字段是必需的');
  } else {
    const winRate = parseFloat(question.correctAnswer.winRate);
    if (isNaN(winRate) || winRate < 0 || winRate > 100) {
      errors.push(`correctAnswer.winRate必须是0-100的数字，当前值: ${question.correctAnswer.winRate}`);
    }
    if (!question.correctAnswer.explanation) {
      errors.push('correctAnswer.explanation字段是必需的');
    }
  }

  // 胜率损失验证 - 改进验证
  const winRateLoss = parseFloat(question.winRateLoss);
  if (isNaN(winRateLoss) || winRateLoss < 0 || winRateLoss > 100) {
    errors.push(`winRateLoss必须是0-100的数字，当前值: ${question.winRateLoss}`);
  }

  return errors;
}

export default withCors(handler);

// 配置请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};