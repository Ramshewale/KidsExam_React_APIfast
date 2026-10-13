import React from 'react';

export default function ResultView({ result, onPracticeAgain }) {
  console.log('ResultView mounted with payload:', result);

  const score = Number(result?.score ?? 0);
  const total = Number(result?.total_questions ?? 0);
  const rawPercentage = result?.percentage ?? (total > 0 ? (score / total) * 100 : 0);
  const percentage = Math.round(Number(rawPercentage));
  const breakdown = Array.isArray(result?.breakdown) ? result.breakdown : [];

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
      {/* Score Summary Card */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--card-radius, 24px)',
          border: '1px solid var(--border-color, #E5E2D8)',
          boxShadow: 'var(--card-shadow, 0 10px 30px rgba(0, 0, 0, 0.06))',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>
          {percentage >= 70 ? '🏆' : '📚'}
        </span>

        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', color: 'var(--color-text-dark, #2C3539)' }}>
          {percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
        </h2>

        <p style={{ color: 'var(--color-text-secondary, #6B7280)', margin: '0 0 1.5rem 0', fontSize: '1rem' }}>
          You scored <strong>{score}</strong> out of <strong>{total}</strong> questions.
        </p>

        <div
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            borderRadius: '16px',
            background: 'var(--bg-muted, #F2EFE5)',
            border: '1px solid var(--border-color, #E5E2D8)',
          }}
        >
          <span
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: percentage >= 70 ? '#16a34a' : '#ea580c',
            }}
          >
            {percentage}%
          </span>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            onClick={onPracticeAgain}
            style={{
              padding: '12px 28px',
              background: 'var(--color-primary, #007AFF)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--button-radius, 16px)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ← Practice Another Deck
          </button>
        </div>
      </div>

      {/* Review Breakdown */}
      {breakdown.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--card-radius, 24px)',
            border: '1px solid var(--border-color, #E5E2D8)',
            boxShadow: 'var(--card-shadow, 0 10px 30px rgba(0, 0, 0, 0.06))',
            padding: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--color-text-dark, #2C3539)' }}>
            Review Summary
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {breakdown.map((item, idx) => {
              const isItemCorrect = Boolean(item.is_correct);

              return (
                <div
                  key={idx}
                  style={{
                    padding: '1.2rem',
                    borderRadius: 'var(--input-radius, 14px)',
                    border: `1.5px solid ${isItemCorrect ? '#bbf7d0' : '#fecaca'}`,
                    background: isItemCorrect ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Question {idx + 1}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: isItemCorrect ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {isItemCorrect ? '✓ Correct' : '✗ Incorrect / Skipped'}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--color-text-dark, #2C3539)' }}>
                    {item.question_text || `Question #${item.question_id}`}
                  </p>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)' }}>
                    Your answer: <strong>{item.selected_answer || 'Skipped'}</strong> | Correct answer:{' '}
                    <strong style={{ color: '#16a34a' }}>{item.correct_answer}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}