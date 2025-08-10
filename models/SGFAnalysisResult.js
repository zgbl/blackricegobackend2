// models/SGFAnalysisResult.js
import mongoose from 'mongoose';

// 策略网络输出子模式
const PolicySchema = new mongoose.Schema({
  move: { type: String, required: true },      // 着法位置，如 "Q16"
  probability: { type: Number, required: true } // 概率
}, { _id: false });

// 变化图子模式
const VariationSchema = new mongoose.Schema({
  moves: [{ type: String }],        // 着法序列，如 ["Q16", "D4", "Q4"]
  winRate: { type: Number },        // 该变化的胜率
  score: { type: Number },          // 该变化的分数
  visits: { type: Number }          // 访问次数
}, { _id: false });

// 单步分析结果子模式
const AnalysisResultSchema = new mongoose.Schema({
  moveNumber: { type: Number, required: true },     // 手数 (1-based)
  move: {                                           // 实际下的棋
    row: { type: Number, required: true },         // 0-18
    col: { type: Number, required: true },         // 0-18
    color: { 
      type: String, 
      enum: ['black', 'white'], 
      required: true 
    },
    position: { type: String, required: true }     // "Q16" 格式
  },
  analysis: {
    recommendedMove: { type: String },              // 推荐着法 "F3"
    winRate: { type: Number },                     // 胜率 0-100
    score: { type: Number },                       // 分数差
    visits: { type: Number },                      // 访问次数
    time: { type: Number },                        // 分析用时(秒)
    
    // 详细分析数据
    policy: [PolicySchema],                        // 策略网络输出
    variations: [VariationSchema],                 // 变化图
    rawData: { type: mongoose.Schema.Types.Mixed } // KataGo 返回的完整原始数据
  }
}, { _id: false });

// 主要的 SGF 分析结果模式
const SGFAnalysisResultSchema = new mongoose.Schema({
  // SGF 文件信息
  sgf: {
    hash: { 
      type: String, 
      required: true,
      index: true  // 用于去重的索引
    },
    filename: { type: String, required: true },
    content: { type: String, required: true },     // SGF 文件内容
    uploadTime: { type: Date, default: Date.now },
    gameInfo: {                                     // 棋谱基本信息
      playerBlack: { type: String, default: '' },
      playerWhite: { type: String, default: '' },
      result: { type: String, default: '' },
      date: { type: String, default: '' },
      event: { type: String, default: '' },
      komi: { type: Number, default: 6.5 },
      handicap: { type: Number, default: 0 }
    }
  },
  
  // 分析配置
  analysisConfig: {
    engine: { 
      type: String, 
      default: 'katago',
      enum: ['katago']
    },
    engineVersion: { type: String, required: true }, // KataGo 版本
    visits: { type: Number, default: 1000 },         // 访问次数设置
    time: { type: Number, default: 10 },             // 时间限制
    analysisDate: { type: Date, default: Date.now }, // 分析时间
    totalMoves: { type: Number, required: true }     // 总手数
  },
  
  // 分析结果数组
  analysisResults: [AnalysisResultSchema],
  
  // 元数据
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    analysisStatus: { 
      type: String, 
      enum: ['completed', 'in_progress', 'failed'],
      default: 'in_progress'
    },
    totalAnalysisTime: { type: Number, default: 0 }, // 总分析时间(秒)
    averageTime: { type: Number, default: 0 },       // 平均每手分析时间(秒)
    version: { type: String, default: '1.0' }        // 数据格式版本
  }
}, {
  collection: 'sgf_analysis_results' // 明确指定集合名称
});

// 索引优化
SGFAnalysisResultSchema.index({ 'sgf.hash': 1 }, { unique: true }); // 防重复
SGFAnalysisResultSchema.index({ 'sgf.filename': 1 });
SGFAnalysisResultSchema.index({ 'metadata.analysisStatus': 1 });
SGFAnalysisResultSchema.index({ 'metadata.createdAt': -1 });
SGFAnalysisResultSchema.index({ 'sgf.gameInfo.playerBlack': 1 });
SGFAnalysisResultSchema.index({ 'sgf.gameInfo.playerWhite': 1 });

// 更新 updatedAt 字段的中间件
SGFAnalysisResultSchema.pre('save', function(next) {
  this.metadata.updatedAt = Date.now();
  
  // 计算平均分析时间
  if (this.analysisResults && this.analysisResults.length > 0) {
    const totalTime = this.analysisResults.reduce((sum, result) => {
      return sum + (result.analysis?.time || 0);
    }, 0);
    this.metadata.totalAnalysisTime = totalTime;
    this.metadata.averageTime = totalTime / this.analysisResults.length;
  }
  
  next();
});

// 实例方法：根据 SGF 内容生成哈希
SGFAnalysisResultSchema.methods.generateHash = function() {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(this.sgf.content).digest('hex');
};

// 静态方法：根据哈希查找是否已存在
SGFAnalysisResultSchema.statics.findByHash = function(hash) {
  return this.findOne({ 'sgf.hash': hash });
};

// 静态方法：根据文件名查找
SGFAnalysisResultSchema.statics.findByFilename = function(filename) {
  return this.find({ 'sgf.filename': filename }).sort({ 'metadata.createdAt': -1 });
};

export default mongoose.models.SGFAnalysisResult || mongoose.model('SGFAnalysisResult', SGFAnalysisResultSchema, 'sgf_analysis_results');