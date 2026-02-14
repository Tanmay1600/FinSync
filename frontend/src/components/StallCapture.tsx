import { type FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'

export function StallCapture() {
  const { addLead } = useApp()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState('')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await addLead({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      interest: interest.trim() || undefined,
      tags: [],
      source: 'stall',
      stage: 'met',
    })
    setSaving(false)
    setJustSaved(true)
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setInterest('')
    setTimeout(() => setJustSaved(false), 2500)
  }

  return (
    <section className="panel">
      <h2>Stall – Quick Visitor Entry</h2>
      <p className="muted">
        Use this on a kiosk / tablet at the booth. Entries are saved locally and synced when
        you are online.
      </p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Name*
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Interest / Notes
          <textarea value={interest} onChange={(e) => setInterest(e.target.value)} rows={3} />
        </label>
        <div className="form-row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save visitor'}
          </button>
          {justSaved && <span className="success">Saved. Screen ready for next visitor.</span>}
        </div>
      </form>

      <div className="hint-row">
        <strong>Coming soon (UI only for now):</strong> QR/vCard scan, visiting card OCR.
      </div>
    </section>
  )
}
