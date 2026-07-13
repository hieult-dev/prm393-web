import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

export default function AssignSubjectsModal({
  student,
  semester,
  subjects,
  assignedSubjectIds,
  gradedSubjectIds,
  onClose,
  onSave,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelectedIds(new Set(assignedSubjectIds))
  }, [assignedSubjectIds])

  const toggleSubject = (subjectId) => {
    if (gradedSubjectIds.has(subjectId)) return
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(subjectId)) next.delete(subjectId)
      else next.add(subjectId)
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(Array.from(selectedIds))
    } catch (err) {
      setError(err.message || 'Không thể gán môn học')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop assignment-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card assignment-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">ENROLLMENT</span>
            <h2>Gán môn học cho sinh viên</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="student-summary">
            <span className="avatar">{student.fullName?.charAt(0) || 'S'}</span>
            <div>
              <strong>{student.fullName || student.userName}</strong>
              <small>{student.userName} · {student.className || 'Chưa có lớp'}</small>
            </div>
            <span className="semester-chip">{semester.name}</span>
          </div>

          {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}

          <div className="assignment-heading">
            <div>
              <span className="field-label">Môn mở trong học kỳ</span>
              <small>Chọn các môn sinh viên sẽ học. Môn đã có điểm không thể bỏ gán.</small>
            </div>
            <strong>{selectedIds.size}/{subjects.length} môn</strong>
          </div>

          {subjects.length === 0 ? (
            <div className="assignment-empty">Học kỳ này chưa có môn học được mở.</div>
          ) : (
            <div className="assignment-subject-list">
              {subjects.map((subject) => {
                const checked = selectedIds.has(subject.id)
                const locked = gradedSubjectIds.has(subject.id)
                return (
                  <label className={`assignment-subject${checked ? ' checked' : ''}${locked ? ' locked' : ''}`} key={subject.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    <span className="assignment-check"><Icon name="check" size={15} /></span>
                    <span className="subject-code-mark">{subject.subjectCode.slice(0, 2)}</span>
                    <span>
                      <strong>{subject.subjectCode}</strong>
                      <small>{subject.subjectName}</small>
                    </span>
                    {locked && <em>Đã có điểm</em>}
                  </label>
                )
              })}
            </div>
          )}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : <><Icon name="check" size={17} /> Lưu môn đã gán</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
