import { useEffect, useMemo, useState } from 'react'
import { adminApi, ApiError } from '../api.js'
import Icon from '../components/Icon.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import ScheduleModal from '../components/ScheduleModal.jsx'

function localDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function ScheduleManagement({
  session,
  students,
  semesters,
  offeredSubjects,
  selectedSemesterId,
  onSemesterChange,
  onLogout,
}) {
  const [selectedClassName, setSelectedClassName] = useState('ALL')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studyDate, setStudyDate] = useState('')
  const [calendarMonth, setCalendarMonth] = useState('')
  const [schedules, setSchedules] = useState([])
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)

  const classNames = useMemo(() => Array.from(new Set(
    students.map((student) => student.className?.trim()).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, 'vi')), [students])
  const classStudents = useMemo(() => students.filter((student) => (
    selectedClassName === 'ALL'
    || (selectedClassName === 'UNASSIGNED' && !student.className?.trim())
    || student.className?.trim() === selectedClassName
  )), [students, selectedClassName])
  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId)
  const selectedSemester = semesters.find((semester) => String(semester.id) === selectedSemesterId)
  const subjectById = useMemo(
    () => new Map(offeredSubjects.map((subject) => [subject.id, subject])),
    [offeredSubjects],
  )
  const scheduleCounts = useMemo(() => {
    const counts = new Map()
    schedules.forEach((schedule) => counts.set(
      schedule.studyDate,
      (counts.get(schedule.studyDate) || 0) + 1,
    ))
    return counts
  }, [schedules])
  const visibleSchedules = useMemo(
    () => studyDate
      ? schedules.filter((schedule) => schedule.studyDate === studyDate)
      : schedules,
    [schedules, studyDate],
  )

  const handleError = (err) => {
    if (err instanceof ApiError && err.status === 401) {
      onLogout()
      return
    }
    setError(err.message || 'Không thể tải lịch học')
  }

  useEffect(() => {
    if (!selectedStudentId && classStudents.length) {
      setSelectedStudentId(String(classStudents[0].id))
    }
  }, [classStudents, selectedStudentId])

  useEffect(() => {
    if (!selectedSemester) return
    const today = localDate()
    const initial = today >= selectedSemester.startDate && today <= selectedSemester.endDate
      ? today
      : selectedSemester.startDate
    setCalendarMonth(initial.slice(0, 7))
    setStudyDate('')
  }, [selectedSemesterId])

  const loadSchedules = async () => {
    if (!selectedStudentId || !selectedSemesterId) {
      setSchedules([])
      setAssignedSubjects([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const [scheduleData, subjectData] = await Promise.all([
        adminApi.schedules(session.accessToken, selectedStudentId, selectedSemesterId),
        adminApi.assignedSubjects(session.accessToken, selectedStudentId, selectedSemesterId),
      ])
      setSchedules(scheduleData)
      setAssignedSubjects(subjectData)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSchedules() }, [selectedStudentId, selectedSemesterId, session.accessToken])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!modalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [modalOpen])

  const changeClass = (event) => {
    const nextClass = event.target.value
    setSelectedClassName(nextClass)
    const nextStudents = students.filter((student) => (
      nextClass === 'ALL'
      || (nextClass === 'UNASSIGNED' && !student.className?.trim())
      || student.className?.trim() === nextClass
    ))
    setSelectedStudentId(nextStudents.length ? String(nextStudents[0].id) : '')
  }

  const openCreate = () => {
    if (!selectedStudent || !selectedSemester) {
      setError('Vui lòng chọn sinh viên và học kỳ trước khi thêm lịch')
      return
    }
    if (!assignedSubjects.length) {
      setError('Sinh viên chưa được gán môn học trong học kỳ này')
      return
    }
    setEditingSchedule(null)
    setModalOpen(true)
  }

  const openEdit = (schedule) => {
    setEditingSchedule(schedule)
    setModalOpen(true)
  }

  const saveSchedule = async (payload) => {
    if (editingSchedule) {
      await adminApi.updateSchedule(session.accessToken, editingSchedule.id, payload)
      setNotice('Đã cập nhật lịch học')
    } else {
      await adminApi.createSchedule(session.accessToken, payload)
      setNotice('Đã thêm lịch học mới')
    }
    setModalOpen(false)
    await loadSchedules()
  }

  const deleteSchedule = async (schedule) => {
    const subject = subjectById.get(schedule.subjectId)
    if (!window.confirm(`Xóa lịch ${subject?.subjectCode || 'môn học'} ngày ${formatDate(schedule.studyDate)}?`)) return
    try {
      await adminApi.deleteSchedule(session.accessToken, schedule.id)
      setNotice('Đã xóa lịch học')
      await loadSchedules()
    } catch (err) {
      handleError(err)
    }
  }

  const today = localDate()
  const upcomingCount = visibleSchedules.filter((schedule) => schedule.studyDate >= today).length
  const scheduledSubjectCount = new Set(visibleSchedules.map((schedule) => schedule.subjectId)).size

  return (
    <div className="admin-content schedule-content">
      {notice && <div className="toast-success"><Icon name="check" size={18} /> {notice}</div>}
      {error && <div className="alert alert-error page-alert"><Icon name="alert" size={18} /> {error}<button type="button" onClick={() => setError('')}>×</button></div>}

      <section className="filter-card">
        <div className="filter-heading">
          <div>
            <span className="section-kicker">BỘ LỌC LỊCH HỌC</span>
            <h2>Chọn sinh viên và học kỳ</h2>
            <p>Lịch học được quản lý riêng theo sinh viên, môn học và từng học kỳ.</p>
          </div>
          <button className="primary-button" type="button" onClick={openCreate} disabled={!selectedStudent || !selectedSemester}>
            <Icon name="plus" size={18} /> Thêm lịch học
          </button>
        </div>
        <div className="schedule-filter-grid">
          <div>
            <label className="field-label" htmlFor="schedule-class-filter">Lớp</label>
            <select id="schedule-class-filter" className="select-control" value={selectedClassName} onChange={changeClass}>
              <option value="ALL">Tất cả lớp</option>
              {classNames.map((className) => <option key={className} value={className}>{className}</option>)}
              {students.some((student) => !student.className?.trim()) && <option value="UNASSIGNED">Chưa xếp lớp</option>}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="schedule-student-filter">Sinh viên</label>
            <select id="schedule-student-filter" className="select-control" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              <option value="">Chọn sinh viên</option>
              {classStudents.map((student) => <option key={student.id} value={student.id}>{student.userName} · {student.fullName || 'Chưa có tên'}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="schedule-semester-filter">Học kỳ</label>
            <select id="schedule-semester-filter" className="select-control" value={selectedSemesterId} onChange={(event) => onSemesterChange(event.target.value)}>
              <option value="">Chọn học kỳ</option>
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} · {semester.schoolYear}</option>)}
            </select>
          </div>
        </div>
      </section>

      {selectedSemester && calendarMonth && (
        <MonthCalendar
          month={calendarMonth}
          selectedDate={studyDate}
          minDate={selectedSemester.startDate}
          maxDate={selectedSemester.endDate}
          scheduleCounts={scheduleCounts}
          onMonthChange={setCalendarMonth}
          onSelectDate={setStudyDate}
        />
      )}

      <section className="stats-grid schedule-stats">
        <article className="stat-card stat-orange"><span className="stat-icon"><Icon name="calendar" /></span><div><small>Tổng buổi học</small><strong>{visibleSchedules.length}</strong><span>{studyDate ? 'Trong ngày đã chọn' : 'Trong học kỳ'}</span></div></article>
        <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="clock" /></span><div><small>Buổi sắp tới</small><strong>{upcomingCount}</strong><span>Từ hôm nay</span></div></article>
        <article className="stat-card stat-green"><span className="stat-icon"><Icon name="book" /></span><div><small>Môn có lịch</small><strong>{scheduledSubjectCount}</strong><span>/ {assignedSubjects.length} môn đã gán</span></div></article>
      </section>

      <section className="table-card schedule-table-card">
        <div className="table-heading">
          <div>
            <span className="section-kicker">THỜI KHÓA BIỂU</span>
            <h2>{selectedStudent ? (selectedStudent.fullName || selectedStudent.userName) : 'Chưa chọn sinh viên'}</h2>
            <p>{selectedStudent?.userName || '—'} · {selectedSemester?.name || 'Chưa chọn học kỳ'}</p>
          </div>
          <span className="status-chip"><span /> {visibleSchedules.length} buổi học</span>
        </div>
        <div className="table-scroll">
          <table className="schedule-table">
            <thead><tr><th>Ngày học</th><th>Thời gian</th><th>Môn học</th><th>Phòng</th><th>Giảng viên</th><th>Ghi chú</th><th className="align-right">Thao tác</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải lịch học...</div></td></tr>
              ) : !selectedStudent || !selectedSemester ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="empty-icon"><Icon name="calendar" size={28} /></span><strong>Chọn sinh viên và học kỳ</strong><p>Danh sách lịch học sẽ hiển thị tại đây.</p></div></td></tr>
              ) : visibleSchedules.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="empty-icon"><Icon name="calendar" size={28} /></span><strong>{studyDate ? 'Ngày này chưa có lịch học' : 'Chưa có lịch học'}</strong><p>{studyDate ? 'Chọn ngày khác trên lịch hoặc xem tất cả ngày.' : 'Nhấn “Thêm lịch học” để tạo buổi học đầu tiên.'}</p></div></td></tr>
              ) : visibleSchedules.map((schedule) => {
                const subject = subjectById.get(schedule.subjectId)
                return (
                  <tr key={schedule.id}>
                    <td><div className="schedule-date-cell"><strong>{formatDate(schedule.studyDate)}</strong><small>{schedule.studyDate >= today ? 'Sắp tới' : 'Đã học'}</small></div></td>
                    <td><span className="time-range"><Icon name="clock" size={15} /> {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}</span></td>
                    <td><div className="subject-cell"><span>{subject?.subjectCode?.slice(0, 2) || 'MH'}</span><div><strong>{subject?.subjectCode || `Môn #${schedule.subjectId}`}</strong><small>{subject?.subjectName || 'Không có thông tin môn'}</small></div></div></td>
                    <td><span className="room-label"><Icon name="location" size={14} /> {schedule.room || '—'}</span></td>
                    <td>{schedule.lecturerName || '—'}</td>
                    <td><span className="schedule-note" title={schedule.note || ''}>{schedule.note || '—'}</span></td>
                    <td><div className="row-actions"><button type="button" onClick={() => openEdit(schedule)} title="Sửa lịch"><Icon name="edit" size={17} /></button><button className="danger" type="button" onClick={() => deleteSchedule(schedule)} title="Xóa lịch"><Icon name="trash" size={17} /></button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && selectedStudent && selectedSemester && (
        <ScheduleModal
          schedule={editingSchedule}
          student={selectedStudent}
          semester={selectedSemester}
          subjects={assignedSubjects}
          onClose={() => setModalOpen(false)}
          onSave={saveSchedule}
        />
      )}
    </div>
  )
}
