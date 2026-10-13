import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ParentDashboard from './components/ParentDashboard';
import TestSession from './components/TestSession';
import ResultView from './components/ResultView';
import AdminPortal from './components/AdminPortal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'parent' | 'student_dash' | 'test' | 'result' | 'admin'
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const handleAuthSuccess = (authData) => {
    setCurrentUser(authData);
    if (authData.role === 'Admin') {
      setView('admin');
    } else if (authData.role === 'Parent') {
      setView('parent');
    } else if (authData.role === 'Student') {
      console.log("Student PIN auth data:", authData);
      setActiveStudent({
        id: authData.user_id,
        name: authData.name,
        class_id: authData.class_id,
        classGrade: authData.class_name || 'Class 10',
      });
      setView('student_dash');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setActiveStudent(null);
    setSelectedChapter(null);
    setTestResult(null);
    setView('login');
  };

  const handleParentSelectStudent = (child) => {
    console.log("Parent clicked launch for child:", child);
    setActiveStudent({
      id: child.id,
      name: child.name,
      class_id: child.class_id,
      classGrade: child.class_name || 'Class 10',
    });
    setView('student_dash');
  };

  const handleStartPractice = (chapter) => {
    setSelectedChapter(chapter);
    setView('test');
  };

  const handleCompleteTest = (resultData) => {
    console.log("Setting testResult and transitioning view to 'result':", resultData);
    setTestResult(resultData);
    setView('result');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* Universal Top Ribbon Across All Authenticated Views */}
      {currentUser && (
        <header style={{
          background: '#1F2937',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: '#D1D5DB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>I'm Ready For Exam</span>
            <span>•</span>
            <span>Logged in as: <strong style={{ color: '#fff' }}>{currentUser.name}</strong> ({currentUser.role})</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {currentUser.role === 'Parent' && view === 'student_dash' && (
              <button
                onClick={() => setView('parent')}
                style={{
                  background: '#374151',
                  color: '#F9FAFB',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ← Back to Family Hub
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        </header>
      )}

      {/* Main Routed Views */}
      {view === 'login' && <Login onAuthSuccess={handleAuthSuccess} />}

      {view === 'parent' && (
        <ParentDashboard
          parentUser={currentUser}
          onSelectStudent={handleParentSelectStudent}
          onLogout={handleLogout}
        />
      )}

      {view === 'student_dash' && (
        <Dashboard
          student={activeStudent}
          onStartPractice={handleStartPractice}
          onLogout={handleLogout}
        />
      )}

      {view === 'test' && (
        <TestSession
          student={activeStudent}
          chapter={selectedChapter}
          onCompleteTest={handleCompleteTest}
        />
      )}

      {view === 'result' && (
        <ResultView
          result={testResult}
          onPracticeAgain={() => setView('student_dash')}
        />
      )}

      {/* Tabbed Admin Workspace */}
      {view === 'admin' && <AdminPortal />}
    </div>
  );
}