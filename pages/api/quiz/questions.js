import dbConnect from '../../../lib/mongodb';
import TestQuestion from '../../../models/TestQuestion';
import withCors from '../withCors';

// 处理POST请求 - 获取答题页面的题目
async function getQuizQuestions(req, res) {
  const { source = 'all', count = 10, random = true } = req.body;
  
  console.log('Quiz questions request:', { source, count, random });
  
  try {
    await dbConnect();
    
    // 构建查询条件
    let query = {};
    if (source !== 'all') {
      query.source = source;
    }
    
    // 获取题目总数用于生成题目编号
    const totalQuestions = await TestQuestion.countDocuments();
    console.log(`Total questions in database: ${totalQuestions}`);
    
    // 获取题目
    let questions;
    if (random) {
      // 随机获取题目
      questions = await TestQuestion.aggregate([
        { $match: query },
        { $sample: { size: parseInt(count) } }
      ]);
    } else {
      // 按顺序获取题目
      questions = await TestQuestion.find(query)
        .limit(parseInt(count))
        .sort({ createdAt: -1 });
    }
    
    // 转换数据格式以匹配前端需求
    const formattedQuestions = questions.map((question, index) => {
      // 从candidatePoints中提取棋盘状态和候选点
      const boardState = [];
      const candidates = [];
      
      // 处理候选点，添加标签A、B、C、D
      const labels = ['A', 'B', 'C', 'D'];
      question.candidatePoints.forEach((point, idx) => {
        if (idx < 4) { // 最多4个候选点
          candidates.push({
            row: point.row,
            col: point.col,
            label: labels[idx],
            winRate: point.winRate
          });
        }
      });
      
      // 从SGF数据中提取棋盘状态（如果有的话）
      // 这里需要根据您的SGF解析逻辑来实现
      // 暂时使用空数组，您可以根据实际需求添加SGF解析
      
      // 找到正确答案的标签
      let correctAnswerLabel = 'A'; // 默认值
      const correctPoint = question.correctAnswer;
      question.candidatePoints.forEach((point, idx) => {
        if (idx < 4 && 
            point.row === correctPoint.row && 
            point.col === correctPoint.col) {
          correctAnswerLabel = labels[idx];
        }
      });
      
      // 计算胜率变化（正确答案的胜率 - 最差选择的胜率）
      const winRates = question.candidatePoints.slice(0, 4).map(p => p.winRate);
      const maxWinRate = Math.max(...winRates);
      const minWinRate = Math.min(...winRates);
      const winrateChange = maxWinRate - minWinRate;
      
      // 生成题目编号：根据创建时间排序来确定题目在数据库中的位置
      // 这里使用一个简单的方法：基于题目的ObjectId生成时间戳来估算编号
      const questionTimestamp = question._id.getTimestamp();
      
      return {
        id: question._id.toString(),
        questionNumber: null, // 将在下面统一计算
        title: question.title || '请选择最佳下法',
        difficulty: question.difficulty || '中等',
        source: question.source || '实战对局',
        boardState: boardState, // 需要根据SGF数据填充
        candidates: candidates,
        correctAnswer: correctAnswerLabel,
        winrateChange: winrateChange,
        // 额外信息供前端使用
        sgfHash: question.sgfHash,
        moveNumber: question.moveNumber,
        createdAt: question.createdAt,
        questionTimestamp: questionTimestamp
      };
    });
    
    // 为了生成准确的题目编号，我们需要获取所有题目的创建时间并排序
    const allQuestions = await TestQuestion.find({}, { _id: 1, createdAt: 1 })
      .sort({ createdAt: 1 }); // 按创建时间升序排列
    
    // 创建一个映射，将题目ID映射到其编号
    const questionNumberMap = new Map();
    allQuestions.forEach((q, index) => {
      questionNumberMap.set(q._id.toString(), index + 1);
    });
    
    // 为每个题目分配正确的编号
    formattedQuestions.forEach(question => {
      question.questionNumber = questionNumberMap.get(question.id) || 0;
    });
    
    // 按题目编号排序（如果不是随机模式）
    if (!random) {
      formattedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
    }
    
    console.log(`Successfully retrieved ${formattedQuestions.length} quiz questions with numbers`);
    console.log('Question numbers:', formattedQuestions.map(q => `#${q.questionNumber}`));
    
    res.status(200).json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
      totalQuestionsInDatabase: totalQuestions
    });
    
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quiz questions',
      details: error.message
    });
  }
}

// 主处理函数
async function handler(req, res) {
  console.log(`Quiz API - ${req.method} request received`);
  console.log('Request body:', req.body);
  
  if (req.method === 'POST') {
    return getQuizQuestions(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
  }
}

export default withCors(handler);

// 配置请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};