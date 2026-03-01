// pages/api/team-match/[id].js
import dbConnect from '../../../lib/mongodb.js';
import TeamMatch from '../../../models/TeamMatch.js';
import allowCors from '../withCors.js';

async function handler(req, res) {
    const { id } = req.query;
    const { method } = req;

    await dbConnect();

    switch (method) {
        case 'GET':
            try {
                const teamMatch = await TeamMatch.findById(id);
                if (!teamMatch) {
                    return res.status(404).json({ success: false, message: 'Team Match not found' });
                }
                res.status(200).json({ success: true, data: teamMatch });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;
        case 'POST':
            // Handle updates here or in a separate update.js
            try {
                const teamMatch = await TeamMatch.findByIdAndUpdate(id, req.body, {
                    new: true,
                    runValidators: true,
                });
                if (!teamMatch) {
                    return res.status(404).json({ success: false, message: 'Team Match not found' });
                }
                res.status(200).json({ success: true, data: teamMatch });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
            break;
        default:
            res.status(405).json({ success: false, message: 'Method not allowed' });
            break;
    }
}

export default allowCors(handler);
