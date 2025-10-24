import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

// DEFINE API_URL CLEARLY HERE
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001'; // Use env variable or default
const EVENTS_API_URL = `${API_BASE_URL}/api/events`; // Construct the full URL
console.log("Using API Base URL:", API_BASE_URL); // Log the base URL being used

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('12:00'); // Default time
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [errorState, setErrorState] = useState(''); // Error display state

  const token = localStorage.getItem('token');
  console.log("Token found:", token ? "Yes" : "No"); // Log if token exists

  // --- Notification Logic ---
  const scheduleNotification = useCallback((event) => {
    if (!event || !event.eventTime || !event.title) {
      console.warn("Attempted to schedule notification for invalid event:", event);
      return;
    }
    console.log("Attempting to schedule notification for:", event.title, "at", event.eventTime);
    const eventTimestamp = new Date(event.eventTime).getTime();
    const now = new Date().getTime();
    const timeToEvent = eventTimestamp - now;

    if (timeToEvent > 0) {
      setTimeout(() => {
        // Check permission again just before showing
        if (Notification.permission === 'granted') {
          console.log("Showing notification for:", event.title);
          new Notification('Reminder!', {
            body: event.title,
          });
        } else {
          console.log("Notification permission not granted when trying to show for:", event.title);
        }
      }, timeToEvent);
      console.log(`Notification for "${event.title}" scheduled in ${timeToEvent} ms`);
    } else {
      console.log(`Event "${event.title}" is in the past, not scheduling notification.`);
    }
  }, []);

  // --- Fetch Events Logic ---
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorState('');
    if (!token) {
      console.error("No token found, cannot fetch events.");
      setErrorState("Authentication error. Please log in again.");
      setIsLoading(false);
      // Redirect to login if needed
      // window.location.href = '/login';
      return;
    }
    console.log("Fetching events from:", EVENTS_API_URL);
    try {
      const res = await axios.get(EVENTS_API_URL, {
        headers: { 'x-auth-token': token },
      });
      console.log("Events fetched successfully:", res.data);
      setEvents(res.data || []); // Ensure it's an array
      // Schedule notifications for all upcoming events after fetching
      if (Array.isArray(res.data)) {
         res.data.forEach(scheduleNotification);
      }
    } catch (err) {
      console.error('Error fetching events:', err.response ? err.response.data : err.message);
      setErrorState(`Failed to load reminders: ${err.response?.data?.msg || err.message}`);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
         // If unauthorized, token might be invalid/expired, log out
         console.log("Token invalid, logging out.");
         localStorage.removeItem('token');
         window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, scheduleNotification]);

  // --- Initial Load Effect ---
  useEffect(() => {
    console.log("DashboardPage mounted. Requesting notification permission...");
    // Ask for notification permission
    Notification.requestPermission().then(permission => {
        console.log("Notification permission status:", permission);
    });
    fetchEvents();
  }, [fetchEvents]); // Run when fetchEvents changes

  // --- Handlers ---
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setErrorState(''); // Clear previous errors
    if (!eventTitle) {
      setErrorState("Please enter a reminder title.");
      return;
    }
    if (!token) {
       setErrorState("Authentication error. Please log in again.");
       return;
    }

    // Combine selected date with the time
    const [hours, minutes] = eventTime.split(':');
    const eventTimestamp = new Date(selectedDate);
    eventTimestamp.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    console.log('Submitting event:', { title: eventTitle, eventTime: eventTimestamp.toISOString() });
    console.log('Using API URL for POST:', EVENTS_API_URL);

    try {
      const res = await axios.post(
        EVENTS_API_URL,
        { title: eventTitle, eventTime: eventTimestamp.toISOString() },
        { headers: { 'x-auth-token': token } }
      );

      console.log("Event saved successfully:", res.data);
      // Add new event to state and schedule notification
      const newEvent = res.data;
      setEvents(prevEvents => [...prevEvents, newEvent]);
      scheduleNotification(newEvent);

      // Reset form
      setShowModal(false);
      setEventTitle('');
      setEventTime('12:00');
    } catch (err) {
      console.error('Error saving event:', err.response ? err.response.data : err.message);
      setErrorState(`Failed to save reminder: ${err.response?.data?.msg || err.message}`);
    }
  };

  // --- Filtering Events ---
  const dailyEvents = events.filter((event) => {
    if (!event || !event.eventTime) return false;
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
            console.log("Logging out.");
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="logout-button"
        >
          Logout
        </button>
      </div>

      {/* Display Loading / Error State */}
      {isLoading && <p>Loading reminders...</p>}
      {errorState && <p className="error-message">{errorState}</p>}

      <div className="dashboard-content" style={{ opacity: isLoading ? 0.5 : 1 }}>
        <div className="calendar-container">
          <Calendar
            onClickDay={handleDateClick}
            value={selectedDate}
            // Add tile content if you want to show dots for days with events
            tileContent={({ date, view }) => {
               if (view === 'month') {
                 const hasEvent = events.some(event =>
                   event && event.eventTime && new Date(event.eventTime).toDateString() === date.toDateString()
                 );
                 return hasEvent ? <div style={{height: '5px', width: '5px', backgroundColor: 'var(--brawl-pink)', borderRadius: '50%', margin: 'auto', marginTop: '2px'}}></div> : null;
               }
            }}
          />
        </div>

        <div className="reminders-list">
          <h3>Reminders for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}:</h3>
          {!isLoading && dailyEvents.length === 0 && (
            <p>No reminders for this day.</p>
          )}
          {dailyEvents.length > 0 && (
            <ul>
              {dailyEvents.map((event) => (
                <li key={event?._id || Math.random()}> {/* Added fallback key */}
                  {event && event.eventTime ? new Date(event.eventTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid Time'} - {event?.title || 'No Title'}
                </li>
              ))}
            </ul>
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
                required
              />
              <label>Time:</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
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
            {/* Display error within modal */}
            {errorState && <p className="error-message">{errorState}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;