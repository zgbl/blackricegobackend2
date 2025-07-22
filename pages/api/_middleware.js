import nc from 'next-connect';
import cors from 'cors';

const handler = nc()
  .use(cors({
    origin: 'http://weiqi.blackrice.top',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));

export default handler;