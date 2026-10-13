import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function ParentDashboard({ parentUser }) {
  const [students, setStudents] = useState(parentUser?.students || []);
  const [selectedStudentId, setSelectedStudentId] = useState(
    parentUser?.students && parentUser.students.length > 0 ? parentUser.students[0].id : null
  );
  const [report, setReport] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // New Student State
  const [newStudent, setNewStudent] = useState({
    name: '',
    username: '',
    password: '',
    class_id: '',
  });

  // Edit Student State
  const [editState, setEditState] = useState({
    name: '',
    username: '',
    password: '',
    class_id: '',
  });

  // Handle Availability State
  const [usernameCheck, setUsernameCheck] = useState({
    checking: false,
    available: null,
    message: '',
  });

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Academic Classes
  useEffect(() => {
    axiosClient.get('/admin/curriculum/classes')
      .then((res) => {
        setClasses(res.data || []);
        if (res.data?.length > 0 && !newStudent.class_id) {
          setNewStudent((prev) => ({ ...prev, class_id: res.data[0].id }));
        }
      })
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // 2. Fetch Progress & Diagnostic Report when selected child changes
  useEffect(() => {
    if (!selectedStudentId) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    axiosClient.get(`/parents/students/${selectedStudentId}/progress-report`)
      .then((res) => {
        setReport(res.data);
        if (res.data?.subjects && res.data.subjects.length > 0) {
          setSelectedSubjectId(res.data.subjects[0].subject_id);
        }
      })
      .catch((err) => {
        console.error('Failed to load child progress report:', err);
        setReport(null);
      })
      .finally(() => {
        setLoadingReport(false);
      });
  }, [selectedStudentId]);

  // 3. Debounced Real-time Username Checker for Add Modal
  useEffect(() => {
    const handle = newStudent.username.trim();
    if (!handle || handle.length < 3) {
      setUsernameCheck({ checking: false, available: null, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameCheck({ checking: true, available: null, message: 'Checking...' });
      try {
        const res = await axiosClient.get(`/auth/check-student-username?username=${encodeURIComponent(handle)}`);
        setUsernameCheck({
          checking: false,
          available: res.data.available,
          message: res.data.message,
        });
      } catch (err) {
        setUsernameCheck({
          checking: false,
          available: false,
          message: err.response?.data?.detail || 'Error verifying username',
        });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [newStudent.username]);

  // Create Child Profile
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (usernameCheck.available === false) {
      setErrorMsg('Please choose an available username before submitting.');
      return;
    }

    try {
      const res = await axiosClient.post(`/auth/parents/${parentUser.user_id}/students`, {
        name: newStudent.name.trim(),
        username: newStudent.username.trim(),
        password: newStudent.password,
        class_id: parseInt(newStudent.class_id, 10),
      });

      const updated = [...students, res.data];
      setStudents(updated);
      setSelectedStudentId(res.data.id);
      setSuccessMsg(`Study profile created for @${res.data.username}! 🚀`);
      setShowAddModal(false);
      setNewStudent({ name: '', username: '', password: '', class_id: classes[0]?.id || 1 });
      setUsernameCheck({ checking: false, available: null, message: '' });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to add student profile.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (child) => {
    setEditingStudent(child);
    setEditState({
      name: child.name,
      username: child.username || '',
      password: '', // Blank means keep existing password
      class_id: child.class_id ? String(child.class_id) : (classes[0]?.id ? String(classes[0].id) : ''),
    });
    setErrorMsg('');
  };

  // Save Child Profile & Credential Changes
  const handleSaveChildEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const payload = {
      name: editState.name.trim(),
      class_id: parseInt(editState.class_id, 10),
      username: editState.username.trim(),
    };
    if (editState.password.trim()) {
      payload.password = editState.password.trim();
    }

    try {
      const res = await axiosClient.put(`/auth/students/${editingStudent.id}`, payload);

      setStudents((prev) =>
        prev.map((s) =>
          s.id === res.data.id
            ? { ...s, name: res.data.name, username: res.data.username, class_id: res.data.class_id, class_name: res.data.class_name }
            : s
        )
      );
      setEditingStudent(null);
      setSuccessMsg(`Credentials and profile updated for @${res.data.username}!`);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update child profile.');
    }
  };

  // Duration Formatter Helper
  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return '0 min';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const activeSubject = report?.subjects?.find((s) => s.subject_id === selectedSubjectId);

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>
      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {/* 1. Family Account Status Bar */}
      <div style={{
        background: 'var(--bg-card, #fff)',
        padding: '1.5rem 2rem',
        borderRadius: 'var(--card-radius, 20px)',
        border: '1px solid var(--border-color, #E5E2D8)',
        boxShadow: 'var(--card-shadow, 0 8px 24px rgba(0,0,0,0.04))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary, #007AFF)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Family Account
          </span>
          <h3 style={{ margin: '4px 0', fontSize: '1.3rem', color: 'var(--color-text-dark, #2C3539)' }}>
            Family Learning Plan
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary, #6B7280)', fontSize: '0.9rem' }}>
            Enrolled Children: <strong>{students.length} {students.length === 1 ? 'student profile' : 'student profiles'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setShowAddModal(true); setErrorMsg(''); }}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary, #007AFF)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--button-radius, 14px)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Add Child Profile
        </button>
      </div>

      {/* 2. Child Profile Selector Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-dark, #2C3539)' }}>
            Child Learning Profiles
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)' }}>
            Select a child to inspect performance diagnostics
          </span>
        </div>

        {students.length === 0 ? (
          <div style={{ background: '#fff', padding: '2.5rem', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1rem 0' }}>No child profiles added yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ padding: '10px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Set Up First Child Profile
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {students.map((child) => {
              const isSelected = child.id === selectedStudentId;
              return (
                <div
                  key={child.id}
                  style={{
                    background: isSelected ? 'var(--bg-card, #fff)' : 'var(--bg-muted, #F2EFE5)',
                    border: isSelected ? '2px solid var(--color-primary, #007AFF)' : '1px solid var(--border-color, #E5E2D8)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: isSelected ? '0 4px 14px rgba(0, 122, 255, 0.12)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(child.id)}
                    style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-dark)' }}>
                      🎓 {child.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {child.class_name || 'Class 10'} • <span style={{ fontWeight: 600, color: '#007AFF' }}>@{child.username || `student_${child.id}`}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(child)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Edit / Reset
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Main Diagnostic Dashboard for Selected Child */}
      {loadingReport ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading performance diagnostics...
        </div>
      ) : !report ? (
        <div style={{ background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            No practice data available for this student. Student practice sessions will appear here automatically.
          </p>
        </div>
      ) : (
        <div>
          {/* A. KPI Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>TOTAL TESTS TAKEN</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text-dark)', marginTop: '4px' }}>
                {report.summary.total_tests_taken}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>OVERALL ACCURACY</span>
              <div style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                marginTop: '4px',
                color: report.summary.overall_avg_score >= 70 ? '#16a34a' : '#ea580c'
              }}>
                {report.summary.overall_avg_score}%
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>TOTAL STUDY TIME</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text-dark)', marginTop: '4px' }}>
                {formatDuration(report.summary.total_study_seconds)}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>FOCUS AREAS</span>
              <div style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                marginTop: '4px',
                color: report.summary.focus_areas_count > 0 ? '#dc2626' : '#16a34a'
              }}>
                {report.summary.focus_areas_count} {report.summary.focus_areas_count === 1 ? 'Chapter' : 'Chapters'}
              </div>
            </div>
          </div>

          {/* B. Focus Area Alert Banner */}
          {report.high_priority_focus?.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <strong style={{ color: '#991b1b', fontSize: '1.05rem' }}>
                  Attention Recommended: Focus Areas Detected
                </strong>
              </div>
              <p style={{ margin: '0 0 10px 0', color: '#7f1d1d', fontSize: '0.9rem' }}>
                Based on score accuracy and timing patterns, your child is experiencing friction here:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {report.high_priority_focus.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                    • <strong>{item.subject} → {item.chapter}</strong> (Score: {item.latest_score}%): <em>{item.reason}</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. Subject Competency Selector Cards */}
          <h4 style={{ fontSize: '1.15rem', margin: '0 0 1rem 0', color: 'var(--color-text-dark)' }}>
            Subject Performance Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {report.subjects.map((sub) => {
              const isSelected = sub.subject_id === selectedSubjectId;
              return (
                <div
                  key={sub.subject_id}
                  onClick={() => setSelectedSubjectId(sub.subject_id)}
                  style={{
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-muted)',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text-dark)' }}>
                      📘 {sub.subject_name}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: sub.average_score >= 70 ? '#16a34a' : sub.average_score > 0 ? '#ea580c' : 'var(--color-text-muted)'
                    }}>
                      {sub.average_score > 0 ? `${sub.average_score}%` : 'Not Started'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Progress: {sub.chapters_completed} / {sub.total_chapters} Chapters</span>
                    <span>Time: {formatDuration(sub.time_invested_seconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* D. Chapter Mastery Matrix */}
          {activeSubject && (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--card-radius, 20px)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--card-shadow)',
              overflow: 'hidden',
              marginBottom: '2.5rem',
            }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-muted)' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-dark)' }}>
                  {activeSubject.subject_name}: Chapter Diagnostic Matrix
                </h4>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>CHAPTER NAME</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>ATTEMPTS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>LATEST SCORE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>BEST SCORE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>AVG PACE / Q</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '12px 16px' }}>DIAGNOSTIC GUIDANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubject.chapters.map((ch) => (
                    <tr key={ch.chapter_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-text-dark)' }}>
                        {ch.chapter_name}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>
                        {ch.attempts}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: ch.latest_score !== null ? (ch.latest_score >= 70 ? '#16a34a' : '#ea580c') : 'var(--color-text-muted)' }}>
                        {ch.latest_score !== null ? `${ch.latest_score}%` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: ch.best_score !== null ? (ch.best_score >= 70 ? '#16a34a' : '#ea580c') : 'var(--color-text-muted)' }}>
                        {ch.best_score !== null ? `${ch.best_score}%` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#475569' }}>
                        {ch.attempts > 0 ? `${ch.avg_time_per_question}s` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ch.status === 'Mastered' ? '#dcfce7' : ch.status === 'In Progress' ? '#fef3c7' : ch.status === 'Needs Attention' ? '#fee2e2' : '#f1f5f9',
                          color: ch.status === 'Mastered' ? '#15803d' : ch.status === 'In Progress' ? '#b45309' : ch.status === 'Needs Attention' ? '#b91c1c' : '#64748b',
                        }}>
                          {ch.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                        {ch.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* E. Recent Activity Trail */}
          <h4 style={{ fontSize: '1.15rem', margin: '0 0 1rem 0', color: 'var(--color-text-dark)' }}>
            Recent Practice Activity Trail
          </h4>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--card-radius, 20px)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}>
            {report.recent_activity?.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', margin: 0 }}>
                No completed test logs recorded yet.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>DATE & TIME</th>
                    <th style={{ padding: '12px 16px' }}>CHAPTER</th>
                    <th style={{ padding: '12px 16px' }}>SCORE</th>
                    <th style={{ padding: '12px 16px' }}>ACCURACY</th>
                    <th style={{ padding: '12px 16px' }}>TIME INVESTED</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recent_activity.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{log.completed_at}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{log.chapter_name}</td>
                      <td style={{ padding: '12px 16px' }}>{log.score} / {log.total_questions}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: log.percentage >= 70 ? '#16a34a' : '#ea580c' }}>
                        {log.percentage}%
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {formatDuration(log.duration_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Child Profile */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Add Child Profile</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>
              Create a personalized username and password for your child.
            </p>

            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Child's Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mina Kumar"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Login Username</label>
                  {usernameCheck.message && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: usernameCheck.available ? '#16a34a' : usernameCheck.checking ? '#64748b' : '#dc2626'
                    }}>
                      {usernameCheck.message}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. MinaCrazy or mina_k"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${
                      usernameCheck.available === true
                        ? '#22c55e'
                        : usernameCheck.available === false
                        ? '#ef4444'
                        : '#cbd5e1'
                    }`,
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Letters, numbers, and underscores only. Case-insensitive.</span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Child's Password</label>
                <input
                  type="password"
                  required
                  minLength="4"
                  placeholder="••••••••"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Academic Class</label>
                <select
                  value={newStudent.class_id}
                  onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={usernameCheck.available === false}
                  style={{
                    padding: '10px 20px',
                    background: usernameCheck.available === false ? '#94a3b8' : 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: usernameCheck.available === false ? 'not-allowed' : 'pointer'
                  }}
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Child Profile / Reset Password */}
      {editingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Edit {editingStudent.name}'s Profile</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>
              Update handle, class, or assign a new password.
            </p>

            <form onSubmit={handleSaveChildEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Child's Name</label>
                <input
                  type="text"
                  required
                  value={editState.name}
                  onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Login Username</label>
                <input
                  type="text"
                  required
                  value={editState.username}
                  onChange={(e) => setEditState({ ...editState, username: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Reset Password <span style={{ fontWeight: 400, color: '#64748b' }}>(leave empty to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={editState.password}
                  onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Target Class</label>
                <select
                  value={editState.class_id}
                  onChange={(e) => setEditState({ ...editState, class_id: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}