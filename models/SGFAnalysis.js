// models/SGFAnalysis.js
import mongoose from 'mongoose';

// 单步分析结果的子模式
const MoveAnalysisSchema = new mongoose.Schema({
  moveNumber: {
    type: Number,
    required: true
  },
  player: {
    type: String,
    enum: ['black', 'white'],
    required: true
  },
  position: {
    row: { type: Number, required: true },
    col: { type: Number, required: true }
  },
  // KataGo 分析结果
  analysis: {
    // 推荐的下一步走法
    suggestions: [{
      move: {
        row: { type: Number, required: true },
        col: { type: Number, required: true }
      },
      winrate: { type: Number, required: true }, // 胜率
      score: { type: Number, required: true },   // 分数
      visits: { type: Number, required: true },  // 访问次数
      pv: [String], // 主要变化序列
      order: { type: Number, required: true }    // 推荐顺序
    }],
    // 当前局面评估
    evaluation: {
      winrate: { type: Number, required: true },
      score: { type: Number, required: true },
      visits: { type: Number, required: true }
    },
    // 分析用时
    analysisTime: { type: Number, required: true }, // 毫秒
    // 是否是最佳手
    isBestMove: { type: Boolean, default: false },
    // 与最佳手的差距
    scoreLoss: { type: Number, default: 0 }
  },
  // 分析时间戳
  analyzedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 主要的 SGF 分析结果模式
const SGFAnalysisSchema = new mongoose.Schema({
  // SGF 文件信息
  sgfInfo: {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadPath: { type: String, required: true }
  },

  // 游戏基本信息
  gameInfo: {
    blackPlayer: { type: String, default: '' },
    whitePlayer: { type: String, default: '' },
    blackRank: { type: String, default: '' },
    whiteRank: { type: String, default: '' },
    result: { type: String, default: '' },
    komi: { type: Number, default: 6.5 },
    handicap: { type: Number, default: 0 },
    boardSize: { type: Number, default: 19 },
    gameDate: { type: String, default: '' },
    event: { type: String, default: '' },
    round: { type: String, default: '' }
  },

  // 分析配置
  analysisConfig: {
    katagoVersion: { type: String, required: true },
    modelName: { type: String, required: true },
    maxVisits: { type: Number, default: 1000 },
    analysisTime: { type: Number, default: 10 }, // 每步分析时间（秒）
    startMove: { type: Number, default: 1 },
    endMove: { type: Number, required: true }
  },

  // 每步的分析结果
  moveAnalyses: [MoveAnalysisSchema],

  // 整体统计
  statistics: {
    totalMoves: { type: Number, required: true },
    analyzedMoves: { type: Number, required: true },
    averageWinrate: {
      black: { type: Number, default: 0 },
      white: { type: Number, default: 0 }
    },
    totalAnalysisTime: { type: Number, required: true }, // 总分析时间（毫秒）
    blunders: { type: Number, default: 0 }, // 失误手数
    mistakes: { type: Number, default: 0 }, // 错误手数
    inaccuracies: { type: Number, default: 0 } // 不准确手数
  },

  // 用户信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 支持匿名分析
  },
  username: {
    type: String,
    default: 'Anonymous'
  },

  // 分析状态
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },

  // 错误信息（如果分析失败）
  errorMessage: {
    type: String,
    default: null
  },

  // 是否公开
  isPublic: {
    type: Boolean,
    default: false
  },

  // 标签
  tags: [{
    type: String,
    trim: true
  }],

  // 备注
  notes: {
    type: String,
    default: ''
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'SGFAnalyses' // 明确指定集合名称
});

// 索引优化
SGFAnalysisSchema.index({ userId: 1, createdAt: -1 });
SGFAnalysisSchema.index({ 'sgfInfo.filename': 1 });
SGFAnalysisSchema.index({ status: 1 });
SGFAnalysisSchema.index({ isPublic: 1, createdAt: -1 });

// 更新 updatedAt 字段
SGFAnalysisSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

// 计算统计信息的方法
SGFAnalysisSchema.methods.calculateStatistics = function () {
  if (this.moveAnalyses.length === 0) return;

  let blackWinrates = [];
  let whiteWinrates = [];
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;

  this.moveAnalyses.forEach(move => {
    if (move.analysis && move.analysis.evaluation) {
      if (move.player === 'black') {
        blackWinrates.push(move.analysis.evaluation.winrate);
      } else {
        whiteWinrates.push(move.analysis.evaluation.winrate);
      }

      // 根据分数损失分类错误
      const scoreLoss = move.analysis.scoreLoss || 0;
      if (scoreLoss > 20) blunders++;
      else if (scoreLoss > 10) mistakes++;
      else if (scoreLoss > 5) inaccuracies++;
    }
  });

  this.statistics = {
    totalMoves: this.moveAnalyses.length,
    analyzedMoves: this.moveAnalyses.filter(m => m.analysis).length,
    averageWinrate: {
      black: blackWinrates.length > 0 ? blackWinrates.reduce((a, b) => a + b, 0) / blackWinrates.length : 0,
      white: whiteWinrates.length > 0 ? whiteWinrates.reduce((a, b) => a + b, 0) / whiteWinrates.length : 0
    },
    totalAnalysisTime: this.moveAnalyses.reduce((total, move) => total + (move.analysis?.analysisTime || 0), 0),
    blunders,
    mistakes,
    inaccuracies
  };
};

export default mongoose.models.SGFAnalysis || mongoose.model('SGFAnalysis', SGFAnalysisSchema, 'SGFAnalyses');