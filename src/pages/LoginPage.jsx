import { useState } from 'react'
import Icon from '../components/Icon.jsx'

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ userName: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin({
        userName: form.userName.trim(),
        password: form.password,
      })
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="brand brand-light">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>Academic Administration</small></span>
        </div>
        <div className="showcase-copy">
          <span className="eyebrow">PRM393 · ADMIN PORTAL</span>
          <h1>Quản lý điểm<br />rõ ràng, chính xác.</h1>
          <p>Tập trung dữ liệu sinh viên, học kỳ và điểm thành phần trong một không gian quản trị thống nhất.</p>
          <div className="showcase-points">
            <span><Icon name="check" size={18} /> Tự động tính điểm tổng</span>
            <span><Icon name="check" size={18} /> Bảo vệ API bằng JWT</span>
            <span><Icon name="check" size={18} /> Theo dõi theo học kỳ</span>
          </div>
        </div>
        <div className="showcase-orb orb-one" />
        <div className="showcase-orb orb-two" />
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand brand">
            <span className="brand-mark"><span>F</span></span>
            <span><strong>FPT Schools</strong><small>Academic Administration</small></span>
          </div>
          <div className="login-heading">
            <span className="login-icon"><Icon name="grade" size={26} /></span>
            <h2>Đăng nhập quản trị</h2>
            <p>Sử dụng tài khoản admin để tiếp tục</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          <label className="field-label" htmlFor="userName">Tên đăng nhập</label>
          <div className="input-shell">
            <Icon name="users" size={19} />
            <input
              id="userName"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập"
              value={form.userName}
              onChange={(event) => setForm({ ...form, userName: event.target.value })}
              required
              autoFocus
            />
          </div>

          <label className="field-label" htmlFor="password">Mật khẩu</label>
          <div className="input-shell">
            <span className="lock-glyph">⌁</span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={6}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <>Đăng nhập <Icon name="chevron" size={18} /></>}
          </button>

          <div className="demo-account">
            <span>Tài khoản khởi tạo</span>
            <code>admin / Admin@123</code>
          </div>
          <p className="security-note">Mật khẩu được mã hóa BCrypt · Phiên đăng nhập JWT 8 giờ</p>
        </form>
      </section>
    </main>
  )
}
