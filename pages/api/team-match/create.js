// pages/api/team-match/create.js
import dbConnect from '../../../lib/mongodb.js';
import TeamMatch from '../../../models/TeamMatch.js';
import allowCors from '../withCors.js';

async function handler(req, res) {
    await dbConnect();

    if (req.method === 'POST') {
        try {
            const teamMatch = new TeamMatch(req.body);
            await teamMatch.save();
            res.status(201).json({ success: true, data: teamMatch });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    } else {
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
}

export default allowCors(handler);
