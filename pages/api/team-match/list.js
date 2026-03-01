// pages/api/team-match/list.js
import dbConnect from '../../../lib/mongodb.js';
import TeamMatch from '../../../models/TeamMatch.js';
import allowCors from '../withCors.js';

async function handler(req, res) {
    if (req.method === 'GET') {
        await dbConnect();

        try {
            const teamMatches = await TeamMatch.find({}).sort({ createdAt: -1 });
            res.status(200).json({ success: true, teamMatches });
        } catch (error) {
            console.error("Error loading team matches:", error.stack || error);
            res.status(500).json({ success: false, message: "Failed to load team matches" });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
}

export default allowCors(handler);
