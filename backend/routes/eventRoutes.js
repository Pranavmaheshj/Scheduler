const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import the authentication middleware
const Event = require('../models/eventModel'); // Import the Event model
const mongoose = require('mongoose'); // Import mongoose for ID validation

// --- Get User's Events Route ---
// @route   GET api/events
// @desc    Get all events for the logged-in user
// @access  Private (Requires JWT token)
router.get('/', auth, async (req, res) => {
  try {
    // Find events associated with the user ID from the token
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
  // Optional: Add more validation for eventTime format if needed

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


// --- *** NEW: Delete Event Route *** ---
// @route   DELETE api/events/:id
// @desc    Delete an event by its ID
// @access  Private (Requires JWT token)
router.delete('/:id', auth, async (req, res) => {
    const eventId = req.params.id;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ msg: 'Invalid Event ID format' });
    }

    try {
        // Find the event by ID
        const event = await Event.findById(eventId);

        // Check if event exists
        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }

        // Check if the logged-in user owns the event
        // event.user stores the ObjectId, req.user.id is the string from the token
        if (event.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to delete this event' });
        }

        // Delete the event
        // Use deleteOne for Mongoose v5+ or findByIdAndRemove for older versions
        await Event.deleteOne({ _id: eventId });
        // or await Event.findByIdAndRemove(eventId);

        console.log(`Event ${eventId} deleted successfully by user ${req.user.id}`);
        res.json({ msg: 'Event removed successfully' });

    } catch (err) {
        console.error('Delete Event Error:', err.message);
        res.status(500).send('Server Error');
    }
});
// --- *** END NEW *** ---

module.exports = router;