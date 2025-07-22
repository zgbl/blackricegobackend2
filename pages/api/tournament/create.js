// pages/api/tournament/create.js
import dbConnect from '../../../lib/mongodb.js';
import Tournament from '../../../models/Tournament';
import allowCors from '../withCors.js';


async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const tournament = new Tournament(req.body);
      await tournament.save();
      res.status(201).json({ success: true, data: tournament });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

export default allowCors(handler);

