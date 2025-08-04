// models/Post.js
import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 改为可选，支持匿名发帖
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // 添加附件字段
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  replies: {
    type: Number,
    default: 0
  },
  isSticky: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastReplyAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // 添加SGF内容字段
  sgfContent: {
    type: String,
    default: null
  }
}, {
  collection: 'Posts' // 明确指定使用 Posts 集合
});

// 更新 updatedAt 字段
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema, 'Posts');