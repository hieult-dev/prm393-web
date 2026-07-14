import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'

const defaultItems = [
  { name: 'PT1', weight: 50, score: 0 },
  { name: 'PT2', weight: 50, score: 0 },
]

export default function GradeModal({
  grade,
  student,
  semester,
  subjects,
  existingSubjectIds,
  initialSubjectId,
  onClose,
  onSave,
}) {
  const [subjectId, setSubjectId] = useState('')
  const [items, setItems] = useState(defaultItems)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (grade) {
      setSubjectId(String(grade.subjectId))
      setItems(grade.items.map((item) => ({
        name: item.name,
        weight: Number(item.weight),
        score: Number(item.score),
      })))
    } else if (initialSubjectId) {
      setSubjectId(String(initialSubjectId))
      setItems(defaultItems)
    }
  }, [grade, initialSubjectId])

  const availableSubjects = subjects.filter((subject) => (
    grade?.subjectId === subject.id || !existingSubjectIds.has(subject.id)
  ))
  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0),
    [items],
  )
  const preview = useMemo(
    () => items.reduce((sum, item) => (
      sum + (Number(item.score) || 0) * (Number(item.weight) || 0) / 100
    ), 0),
    [items],
  )

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )))
  }

  const addItem = () => {
    setItems((current) => [
      ...current,
      { name: `Đầu điểm ${current.length + 1}`, weight: 0, score: 0 },
    ])
  }

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (items.some((item) => !item.name.trim())) {
      setError('Tên đầu điểm không được để trống')
      return
    }
    if (Math.abs(totalWeight - 100) > 0.001) {
      setError('Tổng trọng số phải bằng đúng 100%')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        userId: student.id,
        subjectId: Number(subjectId),
        semesterId: semester.id,
        items: items.map((item) => ({
          name: item.name.trim(),
          weight: Number(item.weight),
          score: Number(item.score),
        })),
      })
    } catch (err) {
      setError(err.message || 'Không thể lưu điểm')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{grade ? 'CẬP NHẬT KẾT QUẢ' : 'THÊM KẾT QUẢ MỚI'}</span>
            <h2>{grade ? `Điểm môn ${grade.subjectCode}` : 'Nhập điểm sinh viên'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="student-summary">
            <span className="avatar">{student.fullName?.charAt(0) || 'S'}</span>
            <div><strong>{student.fullName || student.userName}</strong><small>{student.userName} · {student.className || 'Chưa có lớp'}</small></div>
            <span className="semester-chip">{semester.name}</span>
          </div>

          {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}

          <label className="field-label" htmlFor="subject">Môn học</label>
          <select
            id="subject"
            className="select-control"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={Boolean(grade) || subjects.length === 1}
            required
          >
            <option value="">Chọn môn học</option>
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subjectCode} - {subject.subjectName}
              </option>
            ))}
          </select>

          <div className="items-heading">
            <div><span className="field-label">Điểm thành phần</span><small>Điểm từ 0 đến 10, tổng trọng số bằng 100%</small></div>
            <button
              className="text-button"
              type="button"
              onClick={addItem}
              disabled={items.length >= 20}
            >
              <Icon name="plus" size={16} /> Thêm đầu điểm
            </button>
          </div>

          <div className="grade-items-editor">
            {items.map((item, index) => (
              <div className="grade-item-row" key={index}>
                <div>
                  <label htmlFor={`name-${index}`}>Tên đầu điểm</label>
                  <input
                    id={`name-${index}`}
                    value={item.name}
                    onChange={(event) => updateItem(index, 'name', event.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor={`weight-${index}`}>Trọng số (%)</label>
                  <input
                    id={`weight-${index}`}
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={item.weight}
                    onChange={(event) => updateItem(index, 'weight', event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`score-${index}`}>Điểm</label>
                  <input
                    id={`score-${index}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={item.score}
                    onChange={(event) => updateItem(index, 'score', event.target.value)}
                    required
                  />
                </div>
                <button
                  className="remove-item"
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  aria-label="Xóa đầu điểm"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="grade-preview">
            <div>
              <span>Tổng trọng số</span>
              <strong className={Math.abs(totalWeight - 100) < 0.001 ? 'valid' : 'invalid'}>{totalWeight.toFixed(2)}%</strong>
            </div>
            <div>
              <span>Điểm tổng dự kiến</span>
              <strong>{preview.toFixed(2)}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Hủy</button>
            <button className="primary-button" type="submit" disabled={saving || !subjectId || items.length === 0}>
              {saving ? <span className="spinner" /> : <><Icon name="check" size={17} /> Lưu điểm</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
