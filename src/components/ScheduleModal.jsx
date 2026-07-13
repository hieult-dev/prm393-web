import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'

function initialDate(semester) {
  const today = new Date().toISOString().slice(0, 10)
  if (today >= semester.startDate && today <= semester.endDate) return today
  return semester.startDate
}

export default function ScheduleModal({
  schedule,
  student,
  semester,
  subjects,
  onClose,
  onSave,
}) {
  const defaults = useMemo(() => ({
    subjectId: schedule?.subjectId ? String(schedule.subjectId) : '',
    studyDate: schedule?.studyDate || initialDate(semester),
    startTime: schedule?.startTime?.slice(0, 5) || '07:30',
    endTime: schedule?.endTime?.slice(0, 5) || '09:00',
    room: schedule?.room || '',
    lecturerName: schedule?.lecturerName || '',
    note: schedule?.note || '',
  }), [schedule, semester])
  const [form, setForm] = useState(defaults)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setForm(defaults), [defaults])

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.subjectId) {
      setError('Vui lòng chọn môn học')
      return
    }
    if (form.endTime <= form.startTime) {
      setError('Giờ kết thúc phải sau giờ bắt đầu')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        userId: student.id,
        subjectId: Number(form.subjectId),
        semesterId: semester.id,
        studyDate: form.studyDate,
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim() || null,
        lecturerName: form.lecturerName.trim() || null,
        note: form.note.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Không thể lưu lịch học')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card schedule-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">SCHEDULE</span>
            <h2 id="schedule-modal-title">{schedule ? 'Cập nhật lịch học' : 'Thêm lịch học mới'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="student-summary">
            <span className="avatar">{student.fullName?.trim().charAt(0) || 'S'}</span>
            <div>
              <strong>{student.fullName || student.userName}</strong>
              <small>{student.userName} · {student.className || 'Chưa xếp lớp'}</small>
            </div>
            <span className="semester-chip">{semester.name}</span>
          </div>

          {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}

          <div className="schedule-form-grid">
            <div className="schedule-field-wide">
              <label className="field-label" htmlFor="schedule-subject">Môn học</label>
              <select id="schedule-subject" className="select-control" value={form.subjectId} onChange={update('subjectId')} required>
                <option value="">Chọn môn đã gán cho sinh viên</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.subjectCode} · {subject.subjectName}</option>
                ))}
              </select>
            </div>
            <div className="schedule-field-wide">
              <label className="field-label" htmlFor="schedule-date">Ngày học</label>
              <input id="schedule-date" className="schedule-input" type="date" min={semester.startDate} max={semester.endDate} value={form.studyDate} onChange={update('studyDate')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="schedule-start">Bắt đầu</label>
              <input id="schedule-start" className="schedule-input" type="time" value={form.startTime} onChange={update('startTime')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="schedule-end">Kết thúc</label>
              <input id="schedule-end" className="schedule-input" type="time" value={form.endTime} onChange={update('endTime')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="schedule-room">Phòng học</label>
              <input id="schedule-room" className="schedule-input" maxLength="50" placeholder="Ví dụ: P.302" value={form.room} onChange={update('room')} />
            </div>
            <div>
              <label className="field-label" htmlFor="schedule-lecturer">Giảng viên</label>
              <input id="schedule-lecturer" className="schedule-input" maxLength="100" placeholder="Tên giảng viên" value={form.lecturerName} onChange={update('lecturerName')} />
            </div>
            <div className="schedule-field-full">
              <label className="field-label" htmlFor="schedule-note">Ghi chú</label>
              <textarea id="schedule-note" className="schedule-textarea" rows="3" placeholder="Nội dung cần lưu ý cho buổi học" value={form.note} onChange={update('note')} />
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
            <button className="primary-button" type="submit" disabled={saving || subjects.length === 0}>
              {saving ? <span className="spinner" /> : <><Icon name="check" size={17} /> {schedule ? 'Lưu thay đổi' : 'Thêm lịch học'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
