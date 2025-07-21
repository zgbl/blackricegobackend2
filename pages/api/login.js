// pages/api/login.js
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import Cors from 'cors';
import bcrypt from 'bcryptjs';

// Custom CORS middleware to handle preflight requests and set headers
const allowCors = (fn) => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    //res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    //res.setHeader('Access-Control-Allow-Origin', 'http://weiqi.blackrice.pro'); // Set to your frontend origin
    res.setHeader('Access-Control-Allow-Origin', 'http://weiqi.blackrice.top'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); // Allow specific methods
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end(); // Respond to preflight request
      return;
    }
  
    return await fn(req, res);
  };

//export default async function handler(req, res) {
export default allowCors(async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
})
