
import allowCors from './withCors';
  
    async function handler(req, res) {
      console.log('Received request:', req.method, req.url);
      console.log('Request headers:', req.headers);
    
      if (req.method === 'GET') {
        // 清除 session cookie
        res.setHeader('Set-Cookie', [
          'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=None; Secure'
        ]);
        console.log('Set-Cookie header:', res.getHeader('Set-Cookie'));
        res.status(200).json({ message: 'Logged out successfully' });
      } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
      }
    
      console.log('Response headers:', res.getHeaders());
    }
    
    export default allowCors(handler);