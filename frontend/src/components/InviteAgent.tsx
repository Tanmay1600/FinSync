import { useState } from 'react'
import { X, Mail, User, Phone, Send } from 'lucide-react'
import { api } from '../lib/api'

interface InviteAgentProps {
  onClose: () => void
  onSuccess: () => void
}

export function InviteAgent({ onClose, onSuccess }: InviteAgentProps) {
  const [formData, setFormData] = useState({
    agent_name: '',
    agent_email: '',
    agent_mobno: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const frontend_url = window.location.origin
      await api.inviteAgent({
        ...formData,
        frontend_url,
      })
      
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite New Agent</h2>
          <button className="modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h3>Invitation Sent!</h3>
            <p>An email has been sent to {formData.agent_email} with instructions to join your organization.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="invite-form">
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="agent_name">
                <User className="w-4 h-4" />
                Agent Name
              </label>
              <input
                type="text"
                id="agent_name"
                name="agent_name"
                value={formData.agent_name}
                onChange={handleChange}
                placeholder="Enter agent's full name"
                required
                minLength={2}
                maxLength={120}
              />
            </div>

            <div className="form-group">
              <label htmlFor="agent_email">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                type="email"
                id="agent_email"
                name="agent_email"
                value={formData.agent_email}
                onChange={handleChange}
                placeholder="agent@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="agent_mobno">
                <Phone className="w-4 h-4" />
                Mobile Number
              </label>
              <input
                type="tel"
                id="agent_mobno"
                name="agent_mobno"
                value={formData.agent_mobno}
                onChange={handleChange}
                placeholder="+1234567890"
                required
                minLength={7}
                maxLength={20}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
