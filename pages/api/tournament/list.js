// pages/api/tournament/list.js
import dbConnect from '../../../lib/mongodb.js';
import Tournament from '../../../models/Tournament';
import allowCors from '../withCors.js';

async function handler(req, res) {
    if (req.method === 'GET') {
      await dbConnect();
  
      try {
        const tournaments = await Tournament.find({});
  
        tournaments.forEach(t => {
          console.log(`Tournament: ${t.name} - ${t.location} - ${t.date}`);
        });
  
        res.status(200).json({ success: true, tournaments });
      } catch (error) {
        console.error("Error loading tournaments:", error.stack || error);
        res.status(500).json({ success: false, message: "Failed to load tournaments" });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  }
  
  
  // Wrap the handler with CORS middleware if needed
  export default allowCors(handler);