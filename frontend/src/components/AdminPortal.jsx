import React, { useState } from 'react';
import AdminQuestionBank from './AdminQuestionBank';
import CurriculumManager from './CurriculumManager';
import AdminUsersManager from './AdminUsersManager';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'curriculum' | 'users' | 'billing'

  const tabStyle = (tabId) => ({
    padding: '10px 20px',
    borderRadius: 'var(--button-radius)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    background: activeTab === tabId ? 'var(--bg-tab-active)' : 'transparent',
    color: activeTab === tabId ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    boxShadow: activeTab === tabId ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
      {/* 3-Tab Admin Navigation Bar (Plus Future Billing Placeholder) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-muted)',
        padding: '6px',
        borderRadius: 'var(--button-radius)',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)',
        gap: '6px'
      }}>
        <button style={tabStyle('questions')} onClick={() => setActiveTab('questions')}>
          📝 Question Bank
        </button>
        <button style={tabStyle('curriculum')} onClick={() => setActiveTab('curriculum')}>
          🗂 Curriculum Management
        </button>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>
          👥 Parents & Students
        </button>
        <button style={tabStyle('billing')} onClick={() => setActiveTab('billing')}>
          💳 Payments & Access
        </button>
      </div>

      {/* Render Active Module */}
      {activeTab === 'questions' && <AdminQuestionBank />}
      {activeTab === 'curriculum' && <CurriculumManager />}
      {activeTab === 'users' && <AdminUsersManager />}
      {activeTab === 'billing' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-dark)' }}>💳 Payment & Subscription Gateway</h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Payment reconciliation and licensing tiers will be managed here.
          </p>
        </div>
      )}
    </div>
  );
}