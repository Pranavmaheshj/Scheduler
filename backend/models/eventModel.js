const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  // Link to the user who created the event
  user: {
    type: mongoose.Schema.Types.ObjectId, // Stores the user's MongoDB ID
    ref: 'User', // Refers to the 'User' model
    required: true,
  },
  // The title or description of the reminder
  title: {
    type: String,
    required: true,
    trim: true, // Remove leading/trailing whitespace
  },
  // The exact date and time the reminder is set for
  eventTime: {
    type: Date,
    required: true,
  },
}, {
  // Automatically add 'createdAt' and 'updatedAt' timestamps
  timestamps: true
});

// Export the Mongoose model
module.exports = mongoose.model('Event', EventSchema);