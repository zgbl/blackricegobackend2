import nc from 'next-connect';
import cors from 'cors';

const allowedOrigins = [
  'http://weiqi.blackrice.top',
  'http://forum.blackrice.top', // 添加你的第二个域名
  'https://weiqi.blackrice.top', // 如果有HTTPS域名也请添加
  'https://forum.blackrice.top',
  'http://localhost:3000', // 开发环境可能需要
];

const handler = nc()
  .use(cors({
    origin: function (origin, callback) {
      // 允许没有origin的请求（例如，来自同源的请求或某些工具）
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));

export default handler;