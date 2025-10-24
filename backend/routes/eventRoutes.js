const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import the authentication middleware
const Event = require('../models/eventModel'); // Import the Event model

// --- Get User's Events Route ---
// @route   GET api/events
// @desc    Get all events for the logged-in user
// @access  Private (Requires JWT token)
router.get('/', auth, async (req, res) => {
  try {
    // Find events associated with the user ID from the token
    // req.user.id is added by the 'auth' middleware
    const events = await Event.find({ user: req.user.id }).sort({ eventTime: 1 }); // Sort by event time ascending
    res.json(events);
  } catch (err) {
    console.error('Get Events Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- Create Event Route ---
// @route   POST api/events
// @desc    Create a new event (reminder)
// @access  Private (Requires JWT token)
router.post('/', auth, async (req, res) => {
  const { title, eventTime } = req.body;

  // Basic validation
  if (!title || !eventTime) {
    return res.status(400).json({ msg: 'Please provide a title and event time' });
  }

  try {
    // Create a new event instance
    const newEvent = new Event({
      title,
      eventTime,
      user: req.user.id, // Associate event with the logged-in user
    });

    // Save the event to the database
    const event = await newEvent.save();

    // Send the newly created event back to the client
    res.status(201).json(event); // 201 Created
  } catch (err) {
    console.error('Create Event Error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ msg: 'Validation Error', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;