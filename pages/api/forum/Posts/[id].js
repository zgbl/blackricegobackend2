// pages/api/forum/Posts/[id].js
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import Comment from '../../../../models/Comment';
import allowCors from '../../withCors';

async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // 获取帖子详情
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // 增加浏览量
      await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

      // 获取评论
      const comments = await Comment.find({ postId: id })
        .sort({ createdAt: 1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          post: { ...post.toObject(), views: post.views + 1 },
          comments
        }
      });
    } catch (error) {
      console.error('获取帖子详情错误:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching post',
        error: error.message
      });
    }
  }

  else if (req.method === 'PUT') {
    try {
      const { title, content, category, tags } = req.body;
      
      const updatedPost = await Post.findByIdAndUpdate(
        id,
        {
          title,
          content,
          category,
          tags,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedPost) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost
      });
    } catch (error) {
      console.error('更新帖子错误:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating post',
        error: error.message
      });
    }
  }

  else if (req.method === 'DELETE') {
    try {
      const deletedPost = await Post.findByIdAndDelete(id);
      if (!deletedPost) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // 删除相关评论
      await Comment.deleteMany({ postId: id });

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('删除帖子错误:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting post',
        error: error.message
      });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
  }
}

export default allowCors(handler);