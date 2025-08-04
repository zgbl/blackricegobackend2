//pages/api/withCors.js
const allowedOrigins = [
  'http://weiqi.blackrice.top',    // 开发阶段可能从HTTP访问
  'http://forum.blackrice.top',    // 开发阶段可能从HTTP访问
  'https://weiqi.blackrice.top',   // 生产环境通过HTTPS访问
  'https://forum.blackrice.top',   // 生产环境通过HTTPS访问
  'https://zgbl.github.io',        // GitHub Pages
  'http://localhost:3000',         // 本地开发环境
  'https://localhost:3000',        // 本地开发 HTTPS
  'http://localhost:8090',         // 前端测试端口
  'https://localhost:8090'         // 前端测试端口 HTTPS
];

const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    return await fn(req, res);
  };
  
  export default allowCors;