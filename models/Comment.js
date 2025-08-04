import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Post',
  },
  content: {  // 改为 content 以匹配前端
    type: String,
    required: true,
  },
  text: {  // 保留 text 字段以向后兼容
    type: String,
    required: false,
  },
  username: {
    type: String,
    required: true,
    default: 'Anonymous'  // 添加默认值
  },
  // 添加变化图相关字段
  originalMoves: [{
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    color: { type: String, required: true }
  }],
  variationMoves: [{
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    color: { type: String, required: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
export default Comment;
