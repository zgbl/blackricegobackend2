// models/Tournament.js
import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  location: {
    type: String,
    required: true,
  },
  date: { 
    type: Date, 
    required: true 
  },
  TournamentName: {
    type: String,
    required: false,
  },
  TournamentStartDate: {
    type: Date,
    required: false,
  },
  entry_conditions: {
    type: String,
    required: false,
  },
  format: {
    type: String,
    required: false,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);