import Icon from './Icon.jsx'

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function pad(value) {
  return String(value).padStart(2, '0')
}

function monthValue(year, monthIndex) {
  return `${year}-${pad(monthIndex + 1)}`
}

function moveMonth(value, distance) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + distance, 1)
  return monthValue(date.getFullYear(), date.getMonth())
}

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

function longDate(value) {
  if (!value) return 'Tất cả ngày trong học kỳ'
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function MonthCalendar({
  month,
  selectedDate,
  minDate,
  maxDate,
  scheduleCounts,
  onMonthChange,
  onSelectDate,
}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = monthNumber - 1
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    if (day < 1 || day > daysInMonth) return null
    return `${year}-${pad(monthNumber)}-${pad(day)}`
  })
  const today = new Date()
  const todayValue = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const previousMonth = moveMonth(month, -1)
  const nextMonth = moveMonth(month, 1)
  const canGoPrevious = `${previousMonth}-31` >= minDate
  const canGoNext = `${nextMonth}-01` <= maxDate
  const selectedCount = selectedDate ? (scheduleCounts.get(selectedDate) || 0) : 0

  return (
    <section className="month-calendar-card" aria-label="Lịch chọn ngày học">
      <div className="calendar-toolbar">
        <div>
          <span className="section-kicker">CHỌN NGÀY TRÊN LỊCH</span>
          <h3>{monthLabel(month)}</h3>
        </div>
        <div className="calendar-navigation">
          <button type="button" onClick={() => onMonthChange(previousMonth)} disabled={!canGoPrevious} aria-label="Tháng trước">
            <Icon name="chevron" size={17} className="calendar-chevron-left" />
          </button>
          <button type="button" onClick={() => onMonthChange(nextMonth)} disabled={!canGoNext} aria-label="Tháng sau">
            <Icon name="chevron" size={17} />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((date, index) => {
          if (!date) return <span className="calendar-day calendar-day-empty" key={`empty-${index}`} />
          const disabled = date < minDate || date > maxDate
          const count = scheduleCounts.get(date) || 0
          return (
            <button
              className={`calendar-day${date === selectedDate ? ' selected' : ''}${date === todayValue ? ' today' : ''}${count ? ' has-schedule' : ''}`}
              type="button"
              key={date}
              disabled={disabled}
              onClick={() => onSelectDate(date === selectedDate ? '' : date)}
              aria-pressed={date === selectedDate}
              aria-label={`${longDate(date)}${count ? `, ${count} buổi học` : ''}`}
            >
              <span>{Number(date.slice(-2))}</span>
              {count > 0 && <strong>{count}</strong>}
            </button>
          )
        })}
      </div>

      <div className="calendar-selection">
        <span><Icon name="calendar" size={17} /></span>
        <div>
          <small>Đang hiển thị</small>
          <strong>{longDate(selectedDate)}</strong>
        </div>
        {selectedDate && <em>{selectedCount} buổi học</em>}
        {selectedDate && <button type="button" onClick={() => onSelectDate('')}>Xem tất cả ngày</button>}
      </div>
    </section>
  )
}
