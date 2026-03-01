// models/TeamMatch.js
import mongoose from 'mongoose';

const TeamMatchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    teamA: {
        name: { type: String, required: true },
        players: [{ type: String, required: true }] // Array of 6 names
    },
    teamB: {
        name: { type: String, required: true },
        players: [{ type: String, required: true }] // Array of 6 names
    },
    results: {
        type: [String], // "A", "B", or "Draw" for each board (0-5)
        default: [null, null, null, null, null, null]
    },
    status: {
        type: String,
        enum: ['Planned', 'Ongoing', 'Finished'],
        default: 'Planned'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.TeamMatch || mongoose.model('TeamMatch', TeamMatchSchema);
