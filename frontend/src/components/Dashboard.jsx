import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function Dashboard({ student, onStartPractice, onLogout }) {
  const [decks, setDecks] = useState([]);
  const [pastResults, setPastResults] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    // If student or student.class_id is not yet set, do not query
    if (!student || !student.class_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const studentIdentifier = student.name || student.username || '';

    // Fetch class-scoped decks and student results concurrently
    Promise.all([
      axiosClient.get(`/exams/classes/${student.class_id}/decks`),
      studentIdentifier
        ? axiosClient.get(`/exams/history/${encodeURIComponent(studentIdentifier)}`).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ])
      .then(([decksRes, resultsRes]) => {
        const fetchedDecks = Array.isArray(decksRes.data) ? decksRes.data : [];
        setDecks(fetchedDecks);
        setPastResults(Array.isArray(resultsRes.data) ? resultsRes.data : []);
      })
      .catch((err) => {
        console.error('Failed to load student curriculum decks:', err);
        setDecks([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [student?.class_id, student?.name, student?.username]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Student Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>
            Welcome back, {student?.name || 'Student'}!
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Enrolled in: <strong>{student?.classGrade || 'Class 10'}</strong>
          </p>
        </div>
      </div>

      {/* Available Decks Grid */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--color-text-dark)' }}>
        Your Practice Decks ({student?.classGrade || 'Class 10'})
      </h3>

      {loading ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border-color)',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Loading your practice decks...</p>
        </div>
      ) : decks.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border-color)',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            No practice decks are published for {student?.classGrade || 'Class 10'} yet.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          {decks.map((deck) => (
            <div
              key={deck.chapter_id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow)',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {deck.subject_name}
                </span>
                <h4 style={{ margin: '8px 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-dark)' }}>
                  {deck.chapter_name}
                </h4>
                <p style={{ margin: '0 0 1.25rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {deck.question_count ?? 0} Questions Available
                </p>
              </div>

              <button
                onClick={() => onStartPractice({ id: deck.chapter_id, name: deck.chapter_name })}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--button-radius)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Start Practice →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Historical Performance List */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-text-dark)' }}>Recent Scores</h3>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--card-radius)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden'
      }}>
        {pastResults.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', margin: 0 }}>
            No practice sessions completed yet. Choose a deck above to start!
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <th style={{ padding: '14px 18px' }}>Chapter</th>
                <th style={{ padding: '14px 18px' }}>Score</th>
                <th style={{ padding: '14px 18px' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {pastResults.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{r.chapter_name}</td>
                  <td style={{ padding: '14px 18px' }}>{r.score} / {r.total_questions}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: r.percentage >= 70 ? '#16a34a' : '#ea580c' }}>
                    {r.percentage.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}