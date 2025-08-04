// pages/api/forum/Posts/index.js
import dbConnect from '../../../../lib/mongodb';     // 修复路径：4层向上
import Post from '../../../../models/Post';          // 修复路径：4层向上
import User from '../../../../models/User';          // 修复路径：4层向上
import allowCors from '../../withCors';              // 修复路径：2层向上
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(process.cwd(), 'public', 'uploads');
      // 创建目录如果不存在
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // 生成唯一文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 限制
  },
  fileFilter: function (req, file, cb) {
    // 允许的文件类型
    const allowedTypes = ['.sgf', '.gib', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('只允许 .sgf, .gib, .txt 文件类型'), false);
    }
  }
});

// 中间件包装函数
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

async function handler(req, res) {
  console.log('API被调用了，方法:', req.method);  // 添加调试信息
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 10, category, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      console.log('查询参数:', { page, limit, category, search });  // 添加调试信息

      // 构建查询条件
      let query = {};
      if (category && category !== 'all') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      // 获取帖子列表
      const posts = await Post.find(query)
        .sort({ isSticky: -1, lastReplyAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      console.log('找到帖子数量:', posts.length);  // 添加调试信息

      // 获取总数
      const total = await Post.countDocuments(query);

      // 计算分页信息
      const totalPages = Math.ceil(total / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      // 返回前端期待的数据格式
      res.status(200).json({
        posts,
        hasNextPage,
        hasPrevPage,
        currentPage: parseInt(page),
        totalPages,
        totalPosts: total,
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('获取帖子列表错误:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching posts',
        error: error.message
      });
    }
  }

  else if (req.method === 'POST') {
    try {
      // 处理文件上传
      await runMiddleware(req, res, upload.single('sgfFile'));

      // 从 req.body 获取字段（multer 会解析 FormData）
      const { title, content, category = 'general', author, userId } = req.body;

      console.log('接收到的数据:', { title, content, author, userId, file: req.file });

      // 基本字段验证
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, content'
        });
      }

      let finalAuthor = author || 'Anonymous';

      // 如果提供了userId，验证用户是否存在
      if (userId) {
        try {
          const user = await User.findById(userId);
          if (!user) {
            return res.status(400).json({
              success: false,
              message: 'Invalid user'
            });
          }
          // 如果找到用户但没有提供author，使用用户名
          if (!author) {
            finalAuthor = user.username;
          }
        } catch (userError) {
          console.error('用户验证错误:', userError);
          return res.status(400).json({
            success: false,
            message: 'Invalid user ID format'
          });
        }
      }

      // 处理上传的文件
      let attachments = [];
      let sgfContent = null;
      
      if (req.file) {
        attachments.push({
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: `/uploads/${req.file.filename}`,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // 如果是SGF文件，读取文件内容
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        if (fileExtension === '.sgf') {
          try {
            const filePath = path.join(process.cwd(), 'public', 'uploads', req.file.filename);
            sgfContent = fs.readFileSync(filePath, 'utf8');
            console.log('读取SGF文件内容成功，长度:', sgfContent.length);
          } catch (readError) {
            console.error('读取SGF文件错误:', readError);
            // 不阻止帖子创建，只是没有SGF内容
          }
        }
      }

      const newPost = new Post({
        title,
        content,
        author: finalAuthor,
        userId: userId || null,
        category,
        tags: [],
        attachments,
        sgfContent // 添加SGF内容
      });

      await newPost.save();

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: newPost
      });
    } catch (error) {
      console.error('创建帖子错误:', error);
      
      // 如果是 multer 错误
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: '文件太大，最大允许 5MB'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating post',
        error: error.message
      });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
  }
}

// 禁用 Next.js 默认的 body parser，因为我们使用 multer
export const config = {
  api: {
    bodyParser: false,
  },
};

export default allowCors(handler);