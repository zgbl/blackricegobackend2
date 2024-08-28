// pages/api/tournament/create.js
import dbConnect from '../../../lib/dbConnect';
import Tournament from '../../../models/Tournament';

export default async function handler(req, res) {
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
