import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function AdminUsersManager() {
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Student Edit / Password Reset Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    username: '',
    class_id: '',
    password: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchParentsAndClasses = async () => {
    setLoading(true);
    try {
      const [parentsRes, classesRes] = await Promise.all([
        axiosClient.get('/admin/questions/users/parents'),
        axiosClient.get('/admin/curriculum/classes'),
      ]);
      setParents(parentsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error('Failed to load accounts/classes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentsAndClasses();
  }, []);

  const handleToggleStatus = async (parentId) => {
    try {
      await axiosClient.patch(`/admin/questions/users/parents/${parentId}/toggle-status`);
      fetchParentsAndClasses();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Open Student Edit & Reset Password Modal
  const handleOpenStudentEdit = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      name: student.name,
      username: student.username || '',
      class_id: student.class_id ? String(student.class_id) : (classes[0]?.id ? String(classes[0].id) : ''),
      password: '', // Blank means keep existing password
    });
    setErrorMsg('');
  };

  // Save Student details and optionally new password via PUT /api/auth/students/{id}
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const payload = {
      name: studentForm.name.trim(),
      username: studentForm.username.trim(),
      class_id: parseInt(studentForm.class_id, 10),
    };

    if (studentForm.password.trim()) {
      payload.password = studentForm.password.trim();
    }

    try {
      const res = await axiosClient.put(`/auth/students/${selectedStudent.id}`, payload);
      setSuccessMsg(`Student profile for @${res.data.username || res.data.name} updated successfully!`);
      setSelectedStudent(null);
      fetchParentsAndClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update student profile.');
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>
          Family Accounts & Student Directory
        </h2>
        <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
          Manage parent account status, inspect enrolled children, reassign classes, and reset child passwords
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--card-radius)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '14px 20px' }}>PARENT / EMAIL</th>
              <th style={{ padding: '14px 20px' }}>CHILDREN COUNT</th>
              <th style={{ padding: '14px 20px' }}>REGISTERED STUDENTS (CLICK TO EDIT / RESET)</th>
              <th style={{ padding: '14px 20px' }}>ACCOUNT STATUS</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Loading user directory...</td></tr>
            ) : parents.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No parent accounts found.</td></tr>
            ) : (
              parents.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontWeight: 700,
                      padding: '4px 10px',
                      background: 'var(--bg-muted)',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      {p.students.length} {p.students.length === 1 ? 'Child' : 'Children'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {p.students.length === 0 ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No children created</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {p.students.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleOpenStudentEdit(s)}
                            style={{
                              background: '#fff',
                              border: '1.5px solid var(--border-color)',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Click to edit profile or reset password"
                          >
                            <span>🎓 {s.name} ({s.class_name || 'Class 10'})</span>
                            <span style={{ color: 'var(--color-primary, #007AFF)', fontWeight: 700 }}>
                              @{s.username || `student_${s.id}`} ✏️
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: p.is_active ? '#dcfce7' : '#fee2e2',
                      color: p.is_active ? '#15803d' : '#b91c1c'
                    }}>
                      {p.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleToggleStatus(p.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--button-radius, 8px)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      {p.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Edit Student Profile & Reset Password */}
      {selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Edit Student & Password</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.85rem' }}>
              Update handle, assigned grade, or override child password for support.
            </p>

            {errorMsg && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveStudent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Child Full Name</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Username / Handle</label>
                <input
                  type="text"
                  required
                  value={studentForm.username}
                  onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Assigned Academic Class</label>
                <select
                  value={studentForm.class_id}
                  onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="" disabled>Select a Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Reset Child Password <span style={{ fontWeight: 400, color: '#64748b' }}>(leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setSelectedStudent(null)} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}