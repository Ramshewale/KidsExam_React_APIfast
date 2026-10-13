import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function Login({ onAuthSuccess, onLoginSuccess }) {
  const notifyAuthSuccess = onAuthSuccess || onLoginSuccess;

  const [roleTab, setRoleTab] = useState('student');
  const [isRegistering, setIsRegistering] = useState(false);

  // Student credentials
  const [username, setUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Parent / Admin credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (newTab) => {
    setRoleTab(newTab);
    setIsRegistering(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (roleTab === 'student') {
        if (!username.trim() || !studentPassword.trim()) {
          setErrorMsg('Please enter both your username and password.');
          return;
        }

        setIsLoading(true);
        // Corrected student login endpoint and payload (Pattern A)
        const res = await axiosClient.post('/auth/student/login', {
          username: username.trim(),
          password: studentPassword.trim(),
        });

        const token = res.data.access_token || res.data.token;
        if (token) {
          localStorage.setItem('auth_token', token);
        }

        const raw = res.data.user || res.data;
        const authPayload = {
          user_id: raw.user_id || raw.id,
          name: raw.name || raw.username,
          username: raw.username,
          role: 'Student',
          class_id: raw.class_id,
          class_name: raw.class_name,
          token: token,
        };

        if (typeof notifyAuthSuccess === 'function') {
          notifyAuthSuccess(authPayload);
        }
      } else if (isRegistering) {
        if (!fullName.trim() || !email.trim() || !password) {
          setErrorMsg('Please fill in all required fields.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          return;
        }

        setIsLoading(true);
        // Corrected registration endpoint to match backend route (/auth/register/parent)
        await axiosClient.post('/auth/register/parent', {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password,
        });

        setSuccessMsg('Account created successfully! You can now sign in.');
        setIsRegistering(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        if (!email.trim() || !password) {
          setErrorMsg('Please enter your email and password.');
          return;
        }

        setIsLoading(true);
        const res = await axiosClient.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password: password,
        });

        const token = res.data.access_token || res.data.token;
        if (token) {
          localStorage.setItem('auth_token', token);
        }

        const raw = res.data.user || res.data;
        let formattedRole = raw.role || 'Parent';
        if (formattedRole.toLowerCase() === 'admin') formattedRole = 'Admin';
        if (formattedRole.toLowerCase() === 'parent') formattedRole = 'Parent';

        const authPayload = {
          user_id: raw.user_id || raw.id,
          name: raw.name || raw.full_name || email.trim(),
          role: formattedRole,
          students: raw.students || [],
          token: token,
        };

        if (typeof notifyAuthSuccess === 'function') {
          notifyAuthSuccess(authPayload);
        }
      }
    } catch (err) {
      console.error('Login submit error:', err);
      const detail = err.response?.data?.detail;
      setErrorMsg(
        typeof detail === 'string'
          ? detail
          : 'Operation failed. Please check your details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAF8F2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nunito", sans-serif',
      }}
    >
      {/* Header Badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          fontSize: '3rem',
          marginBottom: '0.75rem',
        }}
      >
        <span>🎒</span>
        <span style={{ transform: 'rotate(-10deg)', display: 'inline-block' }}>
          ✏️
        </span>
        <span>⭐</span>
      </div>

      {/* Title & Subtitle */}
      <h1
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#0084FF',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        I'm Ready For Exam
      </h1>
      <p
        style={{
          margin: '0 0 2rem 0',
          color: '#5B6770',
          fontSize: '1.05rem',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        Practise, play and get ready — one quiz at a time!
      </p>

      {/* Auth Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '430px',
          padding: '2rem',
          border: '1px solid #ECE7D8',
          boxShadow: '0 12px 32px rgba(44, 53, 57, 0.06)',
          boxSizing: 'border-box',
        }}
      >
        {/* Segmented Control */}
        <div
          style={{
            background: '#EFECE1',
            borderRadius: '24px',
            padding: '4px',
            display: 'flex',
            marginBottom: '1.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('student')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: '20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: roleTab === 'student' ? '#FFFFFF' : 'transparent',
              color: roleTab === 'student' ? '#2C3539' : '#7A838A',
              boxShadow:
                roleTab === 'student'
                  ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                  : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>👦</span>
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: '20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: roleTab === 'admin' ? '#FFFFFF' : 'transparent',
              color: roleTab === 'admin' ? '#2C3539' : '#7A838A',
              boxShadow:
                roleTab === 'admin'
                  ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                  : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🛠️</span>
            <span>Parent / Admin</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              background: '#DEF7EC',
              color: '#03543F',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              background: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          {roleTab === 'student' ? (
            <>
              {/* Student: Username */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Student Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MinaCrazy or alex_10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>

              {/* Student: Password */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1.1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>
            </>
          ) : isRegistering ? (
            <>
              {/* Parent Registration: Full Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>

              {/* Parent Registration: Email */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>

              {/* Parent Registration: Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Create Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>

              {/* Parent Registration: Confirm Password */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>
            </>
          ) : (
            <>
              {/* Parent / Admin: Sign In Email */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>

              {/* Parent / Admin: Sign In Password */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#2C3539',
                    marginBottom: '8px',
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2DDD2',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#2C3539',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0084FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2DDD2')}
                />
              </div>
            </>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: '#0084FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.15rem',
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 16px rgba(0, 132, 255, 0.28)',
              transition: 'transform 0.1s ease, background-color 0.2s ease',
            }}
          >
            {isLoading ? (
              'Processing...'
            ) : roleTab === 'student' ? (
              <>
                <span>Let's go!</span>
                <span>🚀</span>
              </>
            ) : isRegistering ? (
              'Create Parent Account →'
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        {/* Link to Toggle Sign Up vs Sign In */}
        {roleTab === 'admin' && (
          <div
            style={{
              marginTop: '1.25rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: '#5B6770',
            }}
          >
            {isRegistering ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0084FF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Sign in here
                </button>
              </>
            ) : (
              <>
                Need a parent account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0084FF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Create account
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}