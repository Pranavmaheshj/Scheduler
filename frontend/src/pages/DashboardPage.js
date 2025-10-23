import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // We keep this for base styles
import axios from 'axios';

// Set this to your backend's URL
// const API_URL = 'http://localhost:5001/api/events'; // OLD
const API_URL = `${process.env.REACT_APP_API_URL}/api/events`; // NEW

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('12:00'); // Default time

  const token = localStorage.getItem('token');

  // Fetch all events on component load
  useEffect(() => {
    // Ask for notification permission right away
    Notification.requestPermission();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { 'x-auth-token': token },
      });
      setEvents(res.data);
      // Schedule notifications for all upcoming events
      res.data.forEach(scheduleNotification);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  // --- NOTIFICATION LOGIC ---
  const scheduleNotification = (event) => {
    const eventTimestamp = new Date(event.eventTime).getTime();
    const now = new Date().getTime();
    const timeToEvent = eventTimestamp - now;

    if (timeToEvent > 0) {
      // Set the timer
      setTimeout(() => {
        // Show the notification
        new Notification('Reminder!', {
          body: event.title,
        });
      }, timeToEvent);
    }
  };
  // --- END NOTIFICATION LOGIC ---

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle) return;

    // Combine selected date with the time
    const [hours, minutes] = eventTime.split(':');
    const eventTimestamp = new Date(selectedDate);
    eventTimestamp.setHours(hours, minutes, 0, 0);

    try {
      const res = await axios.post(
        API_URL,
        { title: eventTitle, eventTime: eventTimestamp.toISOString() },
        { headers: { 'x-auth-token': token } }
      );
      
      // Add new event to state and schedule notification
      const newEvent = res.data;
      setEvents([...events, newEvent]);
      scheduleNotification(newEvent);

      // Reset form
      setShowModal(false);
      setEventTitle('');
      setEventTime('12:00');
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  // Filter events for the selected day
  const dailyEvents = events.filter((event) => {
    const eventDate = new Date(event.eventTime);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <div>
      <div className="dashboard-header">
        <h1>Brawl Reminders</h1>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="logout-button"
        >
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="calendar-container">
          <Calendar
            onClickDay={handleDateClick}
            value={selectedDate}
          />
        </div>

        <div className="reminders-list">
          <h3>Reminders for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}:</h3>
          {dailyEvents.length > 0 ? (
            <ul>
              {dailyEvents.map((event) => (
                <li key={event._id}>
                  {new Date(event.eventTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.title}
                </li>
              ))}
            </ul>
          ) : (
            <p>No reminders for this day.</p>
          )}
        </div>
      </div>


      {/* --- Event Modal --- */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Reminder for {selectedDate.toDateString()}</h3>
            <form onSubmit={handleModalSubmit}>
              <label>Title:</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
              <label>Time:</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
              <div className="modal-buttons">
                <button type="submit" className="brawl-button">Save</button>
                <button 
                  type="button" 
                  className="brawl-button secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;