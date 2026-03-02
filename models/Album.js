// models/Album.js
import mongoose from 'mongoose';

const AlbumSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    producer: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
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
    collection: 'albums'
});

// 复合索引：同一个制作人下的专辑名应该唯一
AlbumSchema.index({ producer: 1, name: 1 }, { unique: true });

// 更新 updatedAt 字段的中间件
AlbumSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.models.Album || mongoose.model('Album', AlbumSchema, 'albums');
