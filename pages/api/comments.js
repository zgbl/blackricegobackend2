// /api/comments.js
import dbConnect from '../../lib/mongodb';
import Comment from '../../models/Comment';

const allowedOrigins = [
  'http://weiqi.blackrice.top',    // 开发阶段可能从HTTP访问
  'http://forum.blackrice.top',    // 开发阶段可能从HTTP访问
  'https://weiqi.blackrice.top',   // 生产环境通过HTTPS访问
  'https://forum.blackrice.top',   // 生产环境通过HTTPS访问
  'http://localhost:3000',         // 本地开发环境
  'https://localhost:3000',        // 本地开发 HTTPS
  'http://localhost:8090',         // 前端测试端口
  'https://localhost:8090'         // 前端测试端口 HTTPS
];

// Custom CORS middleware to handle preflight requests and set headers
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

const getComments = async (postId) => {
  try {
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
    return { success: true, comments };
  } catch (error) {
    return { success: false, error: 'Error fetching comments' };
  }
};

const addComment = async (commentData) => {
  try {
    console.log('Creating comment with data:', commentData);
    const newComment = await Comment.create(commentData);
    console.log('Comment created successfully:', newComment);
    return { success: true, comment: newComment };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: 'Error adding comment' };
  }
};

export default allowCors(async function handler(req, res) {
  console.log(`Comments API: ${req.method} request received`);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  await dbConnect();

  if (req.method === 'GET') {
    // Handle GET request to fetch comments
    const { postId } = req.query;
    
    if (!postId) {
      console.log('GET request missing postId');
      return res.status(400).json({ success: false, message: 'Missing postId in query' });
    }

    const response = await getComments(postId);
    if (response.success) {
      return res.status(200).json(response.comments);
    } else {
      return res.status(500).json({ success: false, message: response.error });
    }
  }

  if (req.method === 'POST') {
    // Handle POST request to add a comment
    const { postId, content, text, username, originalMoves, variationMoves } = req.body;

    console.log('POST request data:', { postId, content, text, username, originalMoves, variationMoves });

    if (!postId) {
      console.log('POST request missing postId');
      return res.status(400).json({ success: false, message: 'Missing postId' });
    }

    if (!content && !text) {
      console.log('POST request missing content/text');
      return res.status(400).json({ success: false, message: 'Missing content or text' });
    }

    // 准备评论数据
    const commentData = {
      postId,
      content: content || text, // 优先使用 content，向后兼容 text
      text: text || content,    // 保持向后兼容
      username: username || 'Anonymous', // 如果没有用户名，使用默认值
      originalMoves: originalMoves || [],
      variationMoves: variationMoves || []
    };

    console.log('Prepared comment data:', commentData);

    const response = await addComment(commentData);
    if (response.success) {
      // 返回完整的响应对象，包含 success: true
      return res.status(201).json(response);
    } else {
      return res.status(500).json({ success: false, message: response.error });
    }
  }

  // For other HTTP methods
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
});
