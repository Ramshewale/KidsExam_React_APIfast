import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';

export default function AdminQuestionBank({ onLogout, onOpenCurriculum }) {
  const [questions, setQuestions] = useState([]);
  const [curriculumTree, setCurriculumTree] = useState([]);

  // Filter Bar Cascading State
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterChapterId, setFilterChapterId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Cascading Selection State for Modals (Class -> Subject -> Chapter)
  const [modalClassId, setModalClassId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [modalChapterId, setModalChapterId] = useState('');

  // Status & Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const fileInputRef = useRef(null);

  // Form state
  const initialForm = {
    chapter_id: '',
    text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    difficulty: 'Medium',
    status: 'Draft',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch Curriculum Tree on Mount
  useEffect(() => {
    axiosClient.get('/admin/academic/tree')
      .then((res) => {
        setCurriculumTree(res.data || []);
      })
      .catch(() => {
        axiosClient.get('/admin/curriculum/tree')
          .then((res) => setCurriculumTree(res.data || []))
          .catch((err) => console.error('Failed to load curriculum tree:', err));
      });
  }, []);

  // Fetch Questions with Cascading Query Parameters
  const fetchQuestions = () => {
    const params = {};
    if (filterChapterId) {
      params.chapter_id = filterChapterId;
    } else if (filterSubjectId) {
      params.subject_id = filterSubjectId;
    } else if (filterClassId) {
      params.class_id = filterClassId;
    }

    if (selectedStatus) params.status = selectedStatus;
    if (selectedDifficulty) params.difficulty = selectedDifficulty;

    axiosClient
      .get('/admin/questions', { params })
      .then((res) => setQuestions(res.data || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchQuestions();
  }, [filterClassId, filterSubjectId, filterChapterId, selectedStatus, selectedDifficulty]);

  // Derived options for Filter Bar
  const filterSelectedClass = curriculumTree.find((c) => String(c.id) === String(filterClassId));
  const filterAvailableSubjects = filterSelectedClass ? (filterSelectedClass.subjects || []) : [];
  const filterSelectedSubject = filterAvailableSubjects.find((s) => String(s.id) === String(filterSubjectId));
  const filterAvailableChapters = filterSelectedSubject ? (filterSelectedSubject.chapters || []) : [];

  // Filter Cascade Handlers
  const handleFilterClassChange = (classId) => {
    setFilterClassId(classId);
    setFilterSubjectId('');
    setFilterChapterId('');
  };

  const handleFilterSubjectChange = (subjectId) => {
    setFilterSubjectId(subjectId);
    setFilterChapterId('');
  };

  const handleFilterChapterChange = (chapterId) => {
    setFilterChapterId(chapterId);
  };

  const handleClearFilters = () => {
    setFilterClassId('');
    setFilterSubjectId('');
    setFilterChapterId('');
    setSelectedStatus('');
    setSelectedDifficulty('');
  };

  // Derived options for Modals
  const activeClass = curriculumTree.find((c) => String(c.id) === String(modalClassId));
  const availableSubjects = activeClass ? (activeClass.subjects || []) : [];
  const activeSubject = availableSubjects.find((s) => String(s.id) === String(modalSubjectId));
  const availableChapters = activeSubject ? (activeSubject.chapters || []) : [];

  // Modal Cascade Handlers
  const handleModalClassChange = (classId) => {
    setModalClassId(classId);
    setModalSubjectId('');
    setModalChapterId('');
    setFormData((prev) => ({ ...prev, chapter_id: '' }));
  };

  const handleModalSubjectChange = (subjectId) => {
    setModalSubjectId(subjectId);
    setModalChapterId('');
    setFormData((prev) => ({ ...prev, chapter_id: '' }));
  };

  const handleModalChapterChange = (chapterId) => {
    setModalChapterId(chapterId);
    setFormData((prev) => ({ ...prev, chapter_id: chapterId }));
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
    // Prefill modal cascade from filter bar if already selected
    setModalClassId(filterClassId || '');
    setModalSubjectId(filterSubjectId || '');
    setModalChapterId(filterChapterId || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setIsEditing(true);
    setEditingId(q.id);
    setFormData({
      chapter_id: q.chapter_id,
      text: q.text,
      options: [...q.options, '', '', '', ''].slice(0, 4),
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      status: q.status,
    });

    // Match hierarchy from tree for the question's chapter_id
    let foundClassId = '';
    let foundSubjectId = '';
    for (const c of curriculumTree) {
      for (const s of (c.subjects || [])) {
        for (const ch of (s.chapters || [])) {
          if (ch.id === q.chapter_id) {
            foundClassId = String(c.id);
            foundSubjectId = String(s.id);
            break;
          }
        }
      }
    }
    setModalClassId(foundClassId);
    setModalSubjectId(foundSubjectId);
    setModalChapterId(String(q.chapter_id));

    setErrorMsg('');
    setShowModal(true);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!modalChapterId) {
      setErrorMsg('Please select Class, Subject, and Chapter.');
      return;
    }

    const cleanedOptions = formData.options.map((o) => o.trim()).filter((o) => o !== '');
    if (cleanedOptions.length < 2) {
      setErrorMsg('Please provide at least 2 non-empty options.');
      return;
    }
    if (!formData.correct_answer.trim()) {
      setErrorMsg('Please designate one option as the correct answer.');
      return;
    }

    try {
      if (isEditing) {
        await axiosClient.put(`/admin/questions/${editingId}`, {
          chapter_id: parseInt(modalChapterId, 10),
          text: formData.text.trim(),
          options: cleanedOptions,
          correct_answer: formData.correct_answer.trim(),
          difficulty: formData.difficulty,
          status: formData.status,
        });
        setSuccessMsg(`Question #${editingId} updated successfully.`);
      } else {
        await axiosClient.post('/admin/questions', {
          chapter_id: parseInt(modalChapterId, 10),
          text: formData.text.trim(),
          options: cleanedOptions,
          correct_answer: formData.correct_answer.trim(),
          difficulty: formData.difficulty,
          status: formData.status,
        });
        setSuccessMsg('New question created successfully.');
      }
      setShowModal(false);
      fetchQuestions();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setErrorMsg(`Duplicate Alert: ${err.response.data.detail}`);
      } else {
        setErrorMsg(err.response?.data?.detail || 'Failed to save question.');
      }
    }
  };

  const handleStatusChange = async (questionId, newStatus) => {
    try {
      await axiosClient.patch(`/admin/questions/${questionId}/status`, {
        status: newStatus,
      });
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: newStatus } : q))
      );
      setSuccessMsg(`Question #${questionId} status set to ${newStatus}.`);
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleOpenBulkModal = () => {
    setModalClassId(filterClassId || '');
    setModalSubjectId(filterSubjectId || '');
    setModalChapterId(filterChapterId || '');
    setBulkResult(null);
    setErrorMsg('');
    setShowBulkModal(true);
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setBulkResult(null);

    if (!modalChapterId) {
      setErrorMsg('Please select Class, Subject, and target Chapter.');
      return;
    }

    const file = fileInputRef.current?.files[0];
    if (!file) {
      setErrorMsg('Please select a CSV or JSON file.');
      return;
    }

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await axiosClient.post(
        `/admin/questions/chapters/${modalChapterId}/bulk-upload`,
        body,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setBulkResult(res.data);
      setSuccessMsg(
        `Bulk Upload complete! Created: ${res.data.created_count}, Skipped: ${res.data.skipped_count}`
      );
      fetchQuestions();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Bulk upload failed.');
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      'text,option_a,option_b,option_c,option_d,correct_answer,difficulty,status\n' +
      '"What is 7 * 8?",54,56,64,48,56,Easy,Active\n' +
      '"What is 15% of 200?",20,30,40,25,30,Medium,Approved\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return { background: '#dcfce7', color: '#15803d' };
      case 'Approved':
        return { background: '#e0e7ff', color: '#4338ca' };
      case 'Reviewed':
        return { background: '#fef3c7', color: '#b45309' };
      case 'Draft':
        return { background: '#f1f5f9', color: '#475569' };
      case 'Inactive':
        return { background: '#fee2e2', color: '#b91c1c' };
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Question Bank Administration</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary, #64748b)' }}>
            Curate, filter by curriculum hierarchy, and manage review statuses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleOpenBulkModal}
            style={{
              padding: '10px 16px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--button-radius, 12px)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⤒ Bulk Import
          </button>

          <button
            onClick={handleOpenCreate}
            style={{
              padding: '10px 18px',
              background: 'var(--color-primary, #007AFF)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--button-radius, 12px)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Question
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* Cascading Filter Bar */}
      <div style={{
        background: 'var(--bg-card, #fff)',
        padding: '1.25rem',
        borderRadius: 'var(--card-radius, 16px)',
        border: '1px solid var(--border-color, #e2e8f0)',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary, #007AFF)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filter Curriculum & Moderation Criteria
          </span>
          {(filterClassId || selectedStatus || selectedDifficulty) && (
            <button
              onClick={handleClearFilters}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          {/* 1. Class Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>1. CLASS</label>
            <select
              value={filterClassId}
              onChange={(e) => handleFilterClassChange(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Classes</option>
              {curriculumTree.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Subject Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>2. SUBJECT</label>
            <select
              value={filterSubjectId}
              disabled={!filterClassId}
              onChange={(e) => handleFilterSubjectChange(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: !filterClassId ? '#f8fafc' : '#fff' }}
            >
              <option value="">All Subjects</option>
              {filterAvailableSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Chapter Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>3. CHAPTER</label>
            <select
              value={filterChapterId}
              disabled={!filterSubjectId}
              onChange={(e) => handleFilterChapterChange(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: !filterSubjectId ? '#f8fafc' : '#fff' }}
            >
              <option value="">All Chapters</option>
              {filterAvailableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>STATUS</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* 5. Difficulty Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>DIFFICULTY</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions Data Table */}
      <div style={{
        background: 'var(--bg-card, #fff)',
        borderRadius: 'var(--card-radius, 16px)',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
              <th style={{ padding: '12px 16px', width: '60px' }}>ID</th>
              <th style={{ padding: '12px 16px' }}>QUESTION STATEMENT</th>
              <th style={{ padding: '12px 16px' }}>CHAPTER</th>
              <th style={{ padding: '12px 16px', width: '90px' }}>DIFFICULTY</th>
              <th style={{ padding: '12px 16px', width: '110px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', width: '190px' }}>ACTIONS & STATUS FLAG</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  No questions found matching your filter criteria.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' }}>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>#{q.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, maxWidth: '380px' }}>{q.text}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{q.chapter_name}</td>
                  <td style={{ padding: '14px 16px' }}>{q.difficulty}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, ...getBadgeStyle(q.status) }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(q)}
                          style={{
                            padding: '6px 12px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          Edit
                        </button>
                        <select
                          value={q.status}
                          onChange={(e) => handleStatusChange(q.id, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="Approved">Approved</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>{isEditing ? `Edit Question #${editingId}` : 'Add New Question'}</h3>

            {errorMsg && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveQuestion}>
              {/* Cascading Selection (Class -> Subject -> Chapter) */}
              <div style={{ background: 'var(--bg-muted, #f8fafc)', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary, #007AFF)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Academic Path
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>1. Class</label>
                    <select
                      value={modalClassId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      required
                    >
                      <option value="">Select Class</option>
                      {curriculumTree.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>2. Subject</label>
                    <select
                      value={modalSubjectId}
                      disabled={!modalClassId}
                      onChange={(e) => handleModalSubjectChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: !modalClassId ? '#f1f5f9' : '#fff' }}
                      required
                    >
                      <option value="">Select Subject</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>3. Chapter</label>
                    <select
                      value={modalChapterId}
                      disabled={!modalSubjectId}
                      onChange={(e) => handleModalChapterChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: !modalSubjectId ? '#f1f5f9' : '#fff' }}
                      required
                    >
                      <option value="">Select Chapter</option>
                      {availableChapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Statement */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Question Statement</label>
                <textarea
                  required
                  rows="3"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {/* Options */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Options & Correct Answer</label>
                {formData.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.correct_answer === opt && opt !== ''}
                      onChange={() => setFormData({ ...formData, correct_answer: opt })}
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
                <small style={{ color: '#64748b' }}>Select the radio button alongside the correct option.</small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Approved">Approved</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalChapterId}
                  style={{
                    padding: '10px 20px',
                    background: !modalChapterId ? '#94a3b8' : 'var(--color-primary, #007AFF)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: !modalChapterId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isEditing ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Bulk Import Questions</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>
              Select target class, subject, and chapter before uploading your CSV or JSON deck.
            </p>

            {errorMsg && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {errorMsg}
              </div>
            )}

            {bulkResult && (
              <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 4px 0', color: '#16a34a', fontWeight: 600 }}>Successfully imported: {bulkResult.created_count}</p>
                <p style={{ margin: '0 0 4px 0', color: '#ea580c', fontWeight: 600 }}>Skipped (Duplicates/Invalid): {bulkResult.skipped_count}</p>
                {bulkResult.skipped_details?.length > 0 && (
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: '#64748b', maxHeight: '100px', overflowY: 'auto' }}>
                    {bulkResult.skipped_details.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleBulkUpload}>
              {/* Target Academic Path Cascading Selectors */}
              <div style={{ background: 'var(--bg-muted, #f8fafc)', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary, #007AFF)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Academic Path
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>1. Class</label>
                    <select
                      value={modalClassId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      required
                    >
                      <option value="">Select Class</option>
                      {curriculumTree.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>2. Subject</label>
                    <select
                      value={modalSubjectId}
                      disabled={!modalClassId}
                      onChange={(e) => handleModalSubjectChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: !modalClassId ? '#f1f5f9' : '#fff' }}
                      required
                    >
                      <option value="">Select Subject</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>3. Chapter</label>
                    <select
                      value={modalChapterId}
                      disabled={!modalSubjectId}
                      onChange={(e) => handleModalChapterChange(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: !modalSubjectId ? '#f1f5f9' : '#fff' }}
                      required
                    >
                      <option value="">Select Chapter</option>
                      {availableChapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* File Upload Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Select CSV or JSON File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.json"
                  style={{ width: '100%', padding: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '6px' }}
                  required
                />
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  style={{ marginTop: '8px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  Download Sample CSV Template
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!modalChapterId}
                  style={{
                    padding: '10px 20px',
                    background: !modalChapterId ? '#94a3b8' : '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: !modalChapterId ? 'not-allowed' : 'pointer'
                  }}
                >
                  Upload & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}