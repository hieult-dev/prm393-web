import { useEffect, useMemo, useState } from 'react'
import { ApiError, teacherApi } from '../api.js'
import Icon from '../components/Icon.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'

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

function formatTime(value) {
  return value?.slice(0, 5) || '--:--'
}

export default function ScheduleManagement({
  session,
  semesters,
  selectedSemesterId,
  onSemesterChange,
  onLogout,
}) {
  const [studyDate, setStudyDate] = useState('')
  const [calendarMonth, setCalendarMonth] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedSemester = semesters.find((semester) => String(semester.id) === selectedSemesterId)
  const schedulesByDate = useMemo(() => {
    const items = new Map()
    schedules.forEach((schedule) => {
      const daySchedules = items.get(schedule.studyDate) || []
      daySchedules.push(schedule)
      items.set(schedule.studyDate, daySchedules)
    })
    items.forEach((daySchedules) => daySchedules.sort((first, second) => (
      `${first.startTime || ''}-${first.id || ''}`.localeCompare(`${second.startTime || ''}-${second.id || ''}`)
    )))
    return items
  }, [schedules])
  const scheduleCounts = useMemo(() => {
    const counts = new Map()
    schedulesByDate.forEach((items, date) => counts.set(date, items.length))
    return counts
  }, [schedulesByDate])
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
    setError(err.message || 'Không thể tải lịch dạy')
  }

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
    if (!selectedSemesterId) {
      setSchedules([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const scheduleData = await teacherApi.schedules(session.accessToken, {
        semesterId: selectedSemesterId,
      })
      setSchedules(scheduleData || [])
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSchedules() }, [selectedSemesterId, session.accessToken])

  const today = localDate()
  const upcomingCount = visibleSchedules.filter((schedule) => schedule.studyDate >= today).length
  const scheduledSubjectCount = new Set(visibleSchedules.map((schedule) => schedule.subjectId)).size
  const studentCount = visibleSchedules.reduce((sum, schedule) => sum + Number(schedule.studentCount || 0), 0)

  return (
    <div className="teacher-content schedule-content">
      {error && <div className="alert alert-error page-alert"><Icon name="alert" size={18} /> {error}<button type="button" onClick={() => setError('')}>×</button></div>}

      <section className="filter-card">
        <div className="filter-heading">
          <div>
            <span className="section-kicker">LỊCH DẠY</span>
            <h2>Chọn học kỳ để xem lịch dạy</h2>
            <p>Lịch được lấy từ backend theo tài khoản teacher đang đăng nhập.</p>
          </div>
        </div>
        <div className="schedule-filter-grid">
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
          scheduleItems={schedulesByDate}
          onMonthChange={setCalendarMonth}
          onSelectDate={setStudyDate}
        />
      )}

      <section className="stats-grid schedule-stats">
        <article className="stat-card stat-orange"><span className="stat-icon"><Icon name="calendar" /></span><div><small>Buổi dạy</small><strong>{visibleSchedules.length}</strong><span>{studyDate ? 'Trong ngày đã chọn' : 'Trong học kỳ'}</span></div></article>
        <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="clock" /></span><div><small>Buổi sắp tới</small><strong>{upcomingCount}</strong><span>Từ hôm nay</span></div></article>
        <article className="stat-card stat-green"><span className="stat-icon"><Icon name="users" /></span><div><small>Lượt sinh viên</small><strong>{studentCount}</strong><span>{scheduledSubjectCount} môn có lịch</span></div></article>
      </section>

      <section className="table-card schedule-table-card">
        <div className="table-heading">
          <div>
            <span className="section-kicker">THỜI KHÓA BIỂU GIẢNG DẠY</span>
            <h2>{selectedSemester?.name || 'Chưa chọn học kỳ'}</h2>
            <p>{studyDate ? formatDate(studyDate) : 'Tất cả ngày trong học kỳ'}</p>
          </div>
          <span className="status-chip"><span /> {visibleSchedules.length} buổi dạy</span>
        </div>
        <div className="table-scroll">
          <table className="schedule-table teacher-schedule-table">
            <thead><tr><th>Ngày dạy</th><th>Thời gian</th><th>Môn học</th><th>Lớp</th><th>Sinh viên</th><th>Phòng</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải lịch dạy...</div></td></tr>
              ) : !selectedSemester ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="empty-icon"><Icon name="calendar" size={28} /></span><strong>Chọn học kỳ</strong><p>Lịch dạy của giáo viên sẽ hiển thị tại đây.</p></div></td></tr>
              ) : visibleSchedules.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><span className="empty-icon"><Icon name="calendar" size={28} /></span><strong>{studyDate ? 'Ngày này chưa có lịch dạy' : 'Chưa có lịch dạy'}</strong><p>{studyDate ? 'Chọn ngày khác trên lịch hoặc xem tất cả ngày.' : 'Kiểm tra dữ liệu lịch trong backend nếu giáo viên đã được phân công.'}</p></div></td></tr>
              ) : visibleSchedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td><div className="schedule-date-cell"><strong>{formatDate(schedule.studyDate)}</strong><small>{schedule.studyDate >= today ? 'Sắp tới' : 'Đã qua'}</small></div></td>
                  <td><span className="time-range"><Icon name="clock" size={15} /> {formatTime(schedule.startTime)}-{formatTime(schedule.endTime)}</span></td>
                  <td><div className="subject-cell"><span>{schedule.subjectCode?.slice(0, 2) || 'MH'}</span><div><strong>{schedule.subjectCode || `Môn #${schedule.subjectId}`}</strong><small>{schedule.subjectName || 'Không có thông tin môn'}</small></div></div></td>
                  <td><span className="schedule-note" title={(schedule.classNames || []).join(', ')}>{schedule.classNames?.length ? schedule.classNames.join(', ') : '—'}</span></td>
                  <td>{Number(schedule.studentCount || 0)}</td>
                  <td><span className="room-label"><Icon name="location" size={14} /> {schedule.room || '—'}</span></td>
                  <td><span className="schedule-note" title={schedule.note || ''}>{schedule.note || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
