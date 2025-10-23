import React, { useState } from 'react';
import axios from 'axios';

// Set this to your backend's URL
const API_URL = 'http://localhost:5001/api/auth';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const url = isLogin ? `${API_URL}/login` : `${API_URL}/register`;
    
    try {
      const res = await axios.post(url, { email, password });
      localStorage.setItem('token', res.data.token);
      // Redirect to dashboard on success
      window.location.href = '/';
    } catch (err) {
      setError(err.response.data.msg || 'Something went wrong');
    }
  };

  return (
    <div className="gemini-card auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="brawl-button">
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      
      <button onClick={() => setIsLogin(!isLogin)} className="toggle-button">
        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
      </button>
    </div>
  );
}

export default LoginPage;