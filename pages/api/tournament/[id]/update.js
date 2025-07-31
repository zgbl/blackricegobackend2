// pages/api/tournament/[id]/update.js
import dbConnect from '../../../../lib/mongodb.js';
import Tournament from '../../../../models/Tournament';

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const tournament = await Tournament.findByIdAndUpdate(id, req.body, { new: true });
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }
      res.status(200).json({ success: true, data: tournament });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
