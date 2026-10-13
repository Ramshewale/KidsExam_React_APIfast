import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function CurriculumManager({ onBack }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Creation modal states
  const [modalType, setModalType] = useState(null); // 'class' | 'subject' | 'chapter'
  const [targetParentId, setTargetParentId] = useState(null);
  const [nameInput, setNameInput] = useState('');

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/curriculum/tree');
      setTree(res.data);
    } catch (err) {
      setErrorMsg('Failed to load curriculum tree.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (modalType === 'class') {
        await axiosClient.post('/admin/curriculum/classes', { name: nameInput.trim() });
        setSuccessMsg(`Class "${nameInput}" created successfully.`);
      } else if (modalType === 'subject') {
        await axiosClient.post('/admin/curriculum/subjects', {
          class_id: targetParentId,
          name: nameInput.trim(),
        });
        setSuccessMsg(`Subject "${nameInput}" added.`);
      } else if (modalType === 'chapter') {
        await axiosClient.post('/admin/curriculum/chapters', {
          subject_id: targetParentId,
          name: nameInput.trim(),
        });
        setSuccessMsg(`Chapter "${nameInput}" added.`);
      }

      setModalType(null);
      setNameInput('');
      fetchTree();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Operation failed.');
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Academic Structure & Curriculum</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Manage Classes, Subjects, and Chapters hierarchy</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setModalType('class'); setNameInput(''); setErrorMsg(''); }}
            style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Class
          </button>

        </div>
      </div>

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

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b' }}>Loading curriculum structure...</p>
      ) : tree.length === 0 ? (
        <div style={{ background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No academic classes configured yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {tree.map((cls) => (
            <div key={cls.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>

              {/* Class Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1.5px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🏫</span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{cls.name}</h3>
                </div>
                <button
                  onClick={() => { setModalType('subject'); setTargetParentId(cls.id); setNameInput(''); setErrorMsg(''); }}
                  style={{ padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Subject
                </button>
              </div>

              {/* Subjects Under Class */}
              <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}>
                {cls.subjects.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No subjects configured under this class.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {cls.subjects.map((sub) => (
                      <div key={sub.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>

                        {/* Subject Title & Add Chapter Action */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>📘 {sub.name}</span>
                          <button
                            onClick={() => { setModalType('chapter'); setTargetParentId(sub.id); setNameInput(''); setErrorMsg(''); }}
                            style={{ padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Add Chapter
                          </button>
                        </div>

                        {/* Chapters List */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          {sub.chapters.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No chapters created yet.</span>
                          ) : (
                            sub.chapters.map((ch) => (
                              <div
                                key={ch.id}
                                style={{
                                  background: '#fff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>📄 {ch.name}</span>
                                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px' }}>
                                  {ch.question_count} Qs
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '14px', maxWidth: '400px', width: '100%', padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', textTransform: 'capitalize' }}>Add New {modalType}</h3>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  {modalType === 'class' ? 'Class Name' : modalType === 'subject' ? 'Subject Name' : 'Chapter Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'class' ? 'e.g. Class 9' : modalType === 'subject' ? 'e.g. Science' : 'e.g. Light & Optics'}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}