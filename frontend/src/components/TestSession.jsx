import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function TestSession({ student, chapter, onCompleteTest }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    if (!chapter?.id) return;

    setLoading(true);
    axiosClient
      .get(`/exams/chapters/${chapter.id}/questions`)
      .then((res) => {
        setQuestions(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load questions:', err);
        setErrorMsg('Failed to load questions for this deck.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [chapter?.id]);

  const currentQuestion = questions[currentIndex];

  // 1. Student checks answer
  const handleCheckAnswer = () => {
    if (!selectedOption) return;
    setHasAnswered(true);
    setIsSkipped(false);
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    setAnswers((prev) => [
      ...prev,
      {
        question_id: currentQuestion.id,
        selected_answer: selectedOption,
        time_spent_seconds: timeSpent,
      },
    ]);
  };

  // 2. Student skips question
  const handleSkipQuestion = () => {
    setHasAnswered(true);
    setIsSkipped(true);
    setSelectedOption(null);
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    setAnswers((prev) => [
      ...prev,
      {
        question_id: currentQuestion.id,
        selected_answer: null,
        time_spent_seconds: timeSpent,
      },
    ]);
  };

  // 3. Move forward or submit with verified answer state
  const handleNextQuestion = () => {
    const nextIdx = currentIndex + 1;

    if (nextIdx < questions.length) {
      setSelectedOption(null);
      setHasAnswered(false);
      setIsSkipped(false);
      setQuestionStartTime(Date.now()); // Reset timer for next card
      setCurrentIndex(nextIdx);
    } else {
      // Final submission: ensure the last answer is included
      const currentAns = {
        question_id: currentQuestion.id,
        selected_answer: isSkipped ? null : selectedOption,
      };

      const alreadyRecorded = answers.some((a) => a.question_id === currentQuestion.id);
      const finalPayload = alreadyRecorded ? answers : [...answers, currentAns];

      submitExam(finalPayload);
    }
  };

  const submitExam = async (finalAnswers) => {
    setIsSubmitting(true);
    const totalDuration = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));

    try {
      const res = await axiosClient.post('/exams/submit', {
        student_id: student?.id || 1,
        chapter_id: chapter.id,
        total_duration_seconds: totalDuration,
        answers: finalAnswers,
      });

      if (res.data) onCompleteTest(res.data);
    } catch (err) {
      console.error('Failed to submit test:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
          Loading flashcard questions...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>{errorMsg}</p>
        <button
          onClick={() => setErrorMsg('')}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--button-radius)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        style={{
          maxWidth: '680px',
          margin: '4rem auto',
          background: 'var(--bg-card)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border-color)',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>No Active Questions</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          This deck does not have any active questions approved yet.
        </p>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const correctTarget = (currentQuestion.correct_answer || '').trim();
  const chosenAnswer = (selectedOption || '').trim();
  const isCorrect = chosenAnswer !== '' && chosenAnswer === correctTarget;

  return (
    <div style={{ maxWidth: '760px', margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
      {/* Progress Bar & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            {chapter.name}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'var(--bg-muted)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'var(--color-primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Main Flashcard */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          padding: '2.5rem 2rem',
        }}
      >
        {currentQuestion.difficulty && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'var(--bg-muted)',
              color: 'var(--color-text-secondary)',
              marginBottom: '1rem',
            }}
          >
            {currentQuestion.difficulty}
          </span>
        )}

        <h3
          style={{
            margin: '0 0 1.75rem 0',
            fontSize: '1.35rem',
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'var(--color-text-dark)',
          }}
        >
          {currentQuestion.text}
        </h3>

        {/* Options */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            marginBottom: '1.5rem',
          }}
        >
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isAnswerTarget = option.trim() === correctTarget;

            let optionBg = isSelected ? 'var(--bg-muted)' : 'var(--bg-card)';
            let optionBorder = isSelected ? '2px solid var(--color-primary)' : '1.5px solid var(--border-color)';
            let optionTextColor = isSelected ? 'var(--color-primary)' : 'var(--color-text-dark)';
            let badgeBg = isSelected ? 'var(--color-primary)' : 'var(--bg-muted)';
            let badgeColor = isSelected ? '#fff' : 'var(--color-text-secondary)';

            if (hasAnswered) {
              if (isAnswerTarget) {
                optionBg = '#dcfce7';
                optionBorder = '2px solid #16a34a';
                optionTextColor = '#15803d';
                badgeBg = '#16a34a';
                badgeColor = '#fff';
              } else if (isSelected && !isAnswerTarget) {
                optionBg = '#fee2e2';
                optionBorder = '2px solid #dc2626';
                optionTextColor = '#b91c1c';
                badgeBg = '#dc2626';
                badgeColor = '#fff';
              } else {
                optionBg = 'var(--bg-card)';
                optionBorder = '1.5px solid var(--border-color)';
                optionTextColor = 'var(--color-text-muted)';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={hasAnswered}
                onClick={() => setSelectedOption(option)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: optionTextColor,
                  background: optionBg,
                  border: optionBorder,
                  borderRadius: 'var(--input-radius)',
                  cursor: hasAnswered ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: badgeBg,
                    color: badgeColor,
                    flexShrink: 0,
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </span>

                <span style={{ flex: 1, wordBreak: 'break-word' }}>{option}</span>

                {hasAnswered && isAnswerTarget && (
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '1rem' }}>✓ Correct</span>
                )}
                {hasAnswered && isSelected && !isAnswerTarget && (
                  <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '1rem' }}>✗ Incorrect</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Immediate Feedback Box */}
        {hasAnswered && (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--input-radius)',
              marginBottom: '1.75rem',
              background: isSkipped ? '#fffbeb' : isCorrect ? '#f0fdf4' : '#fef2f2',
              border: `1.5px solid ${isSkipped ? '#fde68a' : isCorrect ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {isSkipped ? '⏭️' : isCorrect ? '🎉' : '💡'}
              </span>
              <strong
                style={{
                  color: isSkipped ? '#92400e' : isCorrect ? '#166534' : '#991b1b',
                  fontSize: '1rem',
                }}
              >
                {isSkipped
                  ? 'Question Skipped'
                  : isCorrect
                  ? 'Well done! That is correct.'
                  : 'Not quite right.'}
              </strong>
            </div>
            {!isCorrect && (
              <p style={{ margin: '4px 0 0 0', color: isSkipped ? '#b45309' : '#7f1d1d', fontSize: '0.9rem' }}>
                The correct answer is: <strong>{currentQuestion.correct_answer}</strong>
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!hasAnswered ? (
            <>
              <button
                type="button"
                onClick={handleSkipQuestion}
                style={{
                  padding: '12px 22px',
                  borderRadius: 'var(--button-radius)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-muted)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                ⏭ Skip Question
              </button>

              <button
                type="button"
                disabled={!selectedOption}
                onClick={handleCheckAnswer}
                style={{
                  padding: '12px 28px',
                  borderRadius: 'var(--button-radius)',
                  border: 'none',
                  background: selectedOption ? 'var(--color-primary)' : 'var(--bg-muted)',
                  color: selectedOption ? '#fff' : 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: selectedOption ? 'pointer' : 'not-allowed',
                }}
              >
                Check Answer
              </button>
            </>
          ) : (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleNextQuestion}
                style={{
                  padding: '12px 28px',
                  borderRadius: 'var(--button-radius)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : currentIndex + 1 === questions.length
                  ? 'Finish & View Results'
                  : 'Next Question →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}