import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

// DEFINE API_URL CLEARLY HERE
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001'; // Use env variable or default
const EVENTS_API_URL = `${API_BASE_URL}/api/events`; // Construct the full URL

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('12:00'); // Default time

  const token = localStorage.getItem('token');

  // --- Notification Logic ---
  // No changes needed here, moved scheduleNotification inside component
  const scheduleNotification = useCallback((event) => {
    const eventTimestamp = new Date(event.eventTime).getTime();
    const now = new Date().getTime();
    const timeToEvent = eventTimestamp - now;

    if (timeToEvent > 0) {
      setTimeout(() => {
        // Check permission again just before showing
        if (Notification.permission === 'granted') {
          new Notification('Reminder!', {
            body: event.title,
          });
        }
      }, timeToEvent);
    }
  }, []); // Empty dependency array for useCallback as it doesn't depend on component state/props directly


  // --- Fetch Events Logic ---
  const fetchEvents = useCallback(async () => {
    if (!token) return; // Don't fetch if no token
    try {
      const res = await axios.get(EVENTS_API_URL, { // Use defined URL
        headers: { 'x-auth-token': token },
      });
      setEvents(res.data);
      // Schedule notifications for all upcoming events after fetching
      res.data.forEach(scheduleNotification);
    } catch (err) {
      console.error('Error fetching events:', err);
      if (err.response && err.response.status === 401) {
         // If unauthorized, token might be invalid/expired, log out
         localStorage.removeItem('token');
         window.location.href = '/login';
      }
    }
  }, [token, scheduleNotification]); // Add token and scheduleNotification as dependencies


  // --- Initial Load Effect ---
  useEffect(() => {
    // Ask for notification permission
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
        } else {
            console.log('Notification permission denied.');
        }
    });
    fetchEvents();
  }, [fetchEvents]); // Run when fetchEvents changes (due to token potentially)

  // --- Handlers ---
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle || !token) return; // Ensure title and token exist

    // Combine selected date with the time
    const [hours, minutes] = eventTime.split(':');
    const eventTimestamp = new Date(selectedDate);
    eventTimestamp.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0); // Use parseInt

    console.log('Submitting event:', { title: eventTitle, eventTime: eventTimestamp.toISOString() }); // Debugging line
    console.log('Using API URL:', EVENTS_API_URL); // Debugging line

    try {
      const res = await axios.post(
        EVENTS_API_URL, // Use defined URL
        { title: eventTitle, eventTime: eventTimestamp.toISOString() },
        { headers: { 'x-auth-token': token } }
      );

      // Add new event to state and schedule notification
      const newEvent = res.data;
      setEvents(prevEvents => [...prevEvents, newEvent]); // Use functional update
      scheduleNotification(newEvent);

      // Reset form
      setShowModal(false);
      setEventTitle('');
      setEventTime('12:00');
    } catch (err) {
      // Log the detailed error
      console.error('Error saving event:', err.response ? err.response.data : err.message);
      // Optionally display a user-friendly error message
      // setErrorState('Failed to save reminder. Please try again.');
    }
  };

  // --- Filtering Events ---
  // Memoize this calculation if performance becomes an issue
  const dailyEvents = events.filter((event) => {
    if (!event.eventTime) return false; // Add check for valid eventTime
    const eventDate = new Date(event.eventTime);
    return eventDate.toDateString() === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime)); // Sort daily events by time


  // --- Render ---
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
            tileClassName={({ date, view }) => {
              // Add a class to days with events if needed
              if (view === 'month') {
                const hasEvent = events.some(event =>
                  new Date(event.eventTime).toDateString() === date.toDateString()
                );
                return hasEvent ? 'day-with-event' : null;
              }
            }}
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
                required // Add required attribute
              />
              <label>Time:</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required // Add required attribute
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