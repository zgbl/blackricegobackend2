// models/Tournament.js
import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  TournamentName: {
    type: String,
    required: true,
  },
  TournamentStartDate: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  entry_conditions: {
    type: String,
    required: false,
  },
  format: {
    type: String,
    required: true,
    enum: ['Single Round Robin', 'Double Round Robin', 'Swiss System', 'Knockout', 'Other'],
  },
  max_participants: {
    type: Number,
    required: false,
  },
  registration_deadline: {
    type: Date,
    required: false,
  },
  name: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);