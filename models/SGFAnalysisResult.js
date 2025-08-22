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
  winRate: { type: String },        // 该变化的胜率（字符串格式，如 "52.3"）
  score: { type: String },          // 该变化的分数（字符串格式，如 "+2.5"）
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
    }
  },
  analysis: {
    recommendedMove: { type: String },              // 推荐着法 "D4"
    winRate: { type: String },                     // 胜率百分比（字符串格式，如 "52.3"）
    score: { type: String },                       // 形势判断分数（字符串格式，如 "+2.5"）
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
    uploadTime: { type: String, required: true },  // ISO格式时间戳
    gameInfo: {                                     // 棋谱基本信息
      black: { type: String, default: '' },        // 黑棋棋手
      white: { type: String, default: '' },        // 白棋棋手
      result: { type: String, default: '' },       // 比赛结果
      date: { type: String, default: '' },         // 比赛日期
      event: { type: String, default: '' },        // 比赛名称
      komi: { type: Number, default: 6.5 }         // 贴目
    }
  },
  
  // 分析配置
  analysisConfig: {
    engine: { 
      type: String, 
      default: 'katago',
      enum: ['katago']
    },
    engineVersion: { type: String, required: true }, // 引擎版本
    visits: { type: Number, default: 800 },          // 访问次数设置
    time: { type: Number, default: 30 },             // 分析时间
    analysisDate: { type: String, required: true },  // 分析日期 ISO格式
    totalMoves: { type: Number, required: true }     // 总步数
  },
  
  // 分析结果数组
  analysisResults: [AnalysisResultSchema],
  
  // 元数据
  metadata: {
    createdAt: { type: String, required: true },     // 创建时间 ISO格式
    updatedAt: { type: String, required: true },     // 更新时间 ISO格式
    analysisStatus: { 
      type: String, 
      enum: ['completed', 'in_progress', 'failed'],
      default: 'completed'
    },
    totalAnalysisTime: { type: Number, default: 0 }, // 总分析时间(秒)
    averageTime: { type: String, default: '0' },     // 平均每手分析时间（字符串格式）
    version: { type: String, default: '1.0' }        // 数据格式版本
  }
}, {
  collection: 'analysisResults' // 使用你建议的集合名称
});

// 索引优化
SGFAnalysisResultSchema.index({ 'sgf.hash': 1 }, { unique: true }); // 防重复
SGFAnalysisResultSchema.index({ 'sgf.filename': 1 });
SGFAnalysisResultSchema.index({ 'metadata.analysisStatus': 1 });
SGFAnalysisResultSchema.index({ 'metadata.createdAt': -1 });
SGFAnalysisResultSchema.index({ 'sgf.gameInfo.black': 1 });
SGFAnalysisResultSchema.index({ 'sgf.gameInfo.white': 1 });

// 更新 updatedAt 字段的中间件
SGFAnalysisResultSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date().toISOString();
  
  // 计算平均分析时间
  if (this.analysisResults && this.analysisResults.length > 0) {
    const totalTime = this.analysisResults.reduce((sum, result) => {
      return sum + (result.analysis?.time || 0);
    }, 0);
    this.metadata.totalAnalysisTime = totalTime;
    this.metadata.averageTime = (totalTime / this.analysisResults.length).toFixed(2);
  }
  
  next();
});

// 静态方法：根据哈希查找是否已存在
SGFAnalysisResultSchema.statics.findByHash = function(hash) {
  return this.findOne({ 'sgf.hash': hash });
};

export default mongoose.models.SGFAnalysisResult || mongoose.model('SGFAnalysisResult', SGFAnalysisResultSchema, 'analysisResults');