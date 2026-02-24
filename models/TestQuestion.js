// models/TestQuestion.js
import mongoose from 'mongoose';

// 候选点子模式
const CandidatePointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['actual', 'best', 'alternate'],
    required: true
  },
  position: {
    type: String,
    required: true,
    match: /^[A-T][1-9]|1[0-9]$/  // SGF格式位置验证
  },
  row: {
    type: Number,
    required: true,
    min: 0,
    max: 18
  },
  col: {
    type: Number,
    required: true,
    min: 0,
    max: 18
  },
  winRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  score: {
    type: Number,
    required: false,
    min: 0,
    max: 10,
    default: 0
  },
  description: {
    type: String,
    required: false
  },
  winRateLoss: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  }
}, { _id: false });

// 正确答案子模式
const CorrectAnswerSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true,
    match: /^[A-T][1-9]|1[0-9]$/
  },
  winRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  explanation: {
    type: String,
    required: true
  }
}, { _id: false });

// 主要的测试题模式
const TestQuestionSchema = new mongoose.Schema({
  // 唯一标识
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 关联的SGF信息
  sgfHash: {
    type: String,
    required: true,
    index: true
  },
  sgfFilename: {
    type: String,
    required: true
  },

  // 比赛信息
  blackPlayer: { type: String, default: '' },
  whitePlayer: { type: String, default: '' },
  blackRank: { type: String, default: '' },
  whiteRank: { type: String, default: '' },
  gameDate: { type: String, default: '' },
  result: { type: String, default: '' },

  // 步数
  moveNumber: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },

  // 🔥 新增：最后一步着法信息 (用于显示标记)
  lastMove: {
    row: Number,
    col: Number,
    color: String
  },

  // 19x19棋盘状态
  boardState: {
    type: [[String]],
    required: true,
    validate: {
      validator: function (board) {
        if (!Array.isArray(board) || board.length !== 19) return false;
        return board.every(row =>
          Array.isArray(row) &&
          row.length === 19 &&
          row.every(cell => cell === null || cell === 'black' || cell === 'white')
        );
      },
      message: '棋盘状态必须是19x19的数组，值为null、"black"或"white"'
    }
  },

  // 当前下棋方
  currentPlayer: {
    type: String,
    enum: ['black', 'white'],
    required: true
  },

  // 候选点数组
  candidatePoints: {
    type: [CandidatePointSchema],
    required: true,
    validate: {
      validator: function (points) {
        return points.length >= 2; // 至少要有2个候选点
      },
      message: '至少需要2个候选点'
    }
  },

  // 正确答案
  correctAnswer: {
    type: CorrectAnswerSchema,
    required: true
  },

  // 胜率损失
  winRateLoss: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  // 验证状态
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'verified',
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },

  // 难度
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true
  },

  // 题目文本
  questionText: {
    type: String,
    required: true
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'testQuestions'
});

// 索引设计
TestQuestionSchema.index({ sgfHash: 1 });
TestQuestionSchema.index({ difficulty: 1 });
TestQuestionSchema.index({ moveNumber: 1 });
TestQuestionSchema.index({ createdAt: -1 });
TestQuestionSchema.index({ id: 1 }, { unique: true });
TestQuestionSchema.index({ sgfHash: 1, moveNumber: 1 }); // 复合索引

// 更新 updatedAt 字段的中间件
TestQuestionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：根据SGF哈希查找测试题
TestQuestionSchema.statics.findBySgfHash = function (sgfHash) {
  return this.find({ sgfHash });
};

// 静态方法：根据难度查找测试题
TestQuestionSchema.statics.findByDifficulty = function (difficulty) {
  return this.find({ difficulty });
};

// 静态方法：获取统计信息
TestQuestionSchema.statics.getStats = async function () {
  const totalQuestions = await this.countDocuments();

  const difficultyStats = await this.aggregate([
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 }
      }
    }
  ]);

  const sgfStats = await this.aggregate([
    {
      $group: {
        _id: '$sgfHash',
        count: { $sum: 1 },
        filename: { $first: '$sgfFilename' }
      }
    },
    {
      $group: {
        _id: null,
        totalSgfFiles: { $sum: 1 },
        avgQuestionsPerSgf: { $avg: '$count' }
      }
    }
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const questionsCreatedToday = await this.countDocuments({
    createdAt: { $gte: today }
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const questionsCreatedThisWeek = await this.countDocuments({
    createdAt: { $gte: weekAgo }
  });

  return {
    totalQuestions,
    difficultyStats: difficultyStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { easy: 0, medium: 0, hard: 0 }),
    sgfStats: sgfStats[0] || { totalSgfFiles: 0, avgQuestionsPerSgf: 0 },
    recentActivity: {
      questionsCreatedToday,
      questionsCreatedThisWeek
    }
  };
};

// 实例方法：验证候选点坐标
TestQuestionSchema.methods.validateCandidatePoints = function () {
  return this.candidatePoints.every(point => {
    return point.row >= 0 && point.row <= 18 &&
      point.col >= 0 && point.col <= 18 &&
      point.winRate >= 0 && point.winRate <= 100;
  });
};

export default mongoose.models.TestQuestion || mongoose.model('TestQuestion', TestQuestionSchema, 'testQuestions');