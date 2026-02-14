import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobNo: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    orgDescription: '',
    orgWebsite: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name: formData.name,
        email: formData.email,
        mobNo: formData.mobNo,
        password: formData.password,
        orgName: formData.orgName,
        orgDescription: formData.orgDescription || undefined,
        orgWebsite: formData.orgWebsite || undefined,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <div className="brand-mark">F</div>
          <h1>Create Account</h1>
          <p className="muted">Set up your FinSync account and organization</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-section">
            <h3>Personal Information</h3>
            
            <label>
              Full Name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
              />
            </label>

            <div className="auth-row">
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="mobNo"
                  value={formData.mobNo}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  required
                  minLength={7}
                  maxLength={20}
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="auth-row">
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>
            </div>
          </div>

          <div className="auth-section">
            <h3>Organization Details</h3>

            <label>
              Organization Name
              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                placeholder="Acme Corporation"
                required
                minLength={2}
                maxLength={120}
              />
            </label>

            <label>
              Description <span className="optional">(optional)</span>
              <textarea
                name="orgDescription"
                value={formData.orgDescription}
                onChange={handleChange}
                placeholder="Tell us about your organization..."
                rows={3}
                maxLength={1000}
              />
            </label>

            <label>
              Website <span className="optional">(optional)</span>
              <input
                type="url"
                name="orgWebsite"
                value={formData.orgWebsite}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="auth-btn">
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
