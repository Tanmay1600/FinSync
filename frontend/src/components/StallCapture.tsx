import { type FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import { stallTagOptions } from '../data/stallTags'

export function StallCapture() {
  const { addLead, leads } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [remarks, setRemarks] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const emailKey = trimmedEmail.toLowerCase()
    const sanitizedPhone = phone.replace(/\D/g, '')

    if (!trimmedEmail || !sanitizedPhone) {
      setError('Email and phone number are mandatory in stall mode.')
      return
    }

    if (selectedTags.length === 0) {
      setError('Please choose at least one tag to describe the visitor.')
      return
    }

    if (sanitizedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits for stall capture entries.')
      return
    }

    const emailExists = leads.some((lead) => lead.email?.toLowerCase() === emailKey)
    const phoneExists = leads.some(
      (lead) => lead.phone && lead.phone.replace(/\D/g, '') === sanitizedPhone,
    )

    if (emailExists || phoneExists) {
      setError(emailExists ? 'This email already exists in the local queue.' : 'This phone number already exists in the local queue.')
      return
    }

    setSaving(true)
    await addLead({
      name: name.trim() || 'Visitor',
      email: trimmedEmail,
      phone: sanitizedPhone,
      interest: remarks.trim() || undefined,
      tags: selectedTags,
      source: 'stall',
      stage: 'met',
    })
    setSaving(false)
    setJustSaved(true)
    setName('')
    setEmail('')
    setPhone('')
    setRemarks('')
    setSelectedTags([])
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
          Name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Visitor name" />
        </label>
        <label>
          Email*
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@domain.com"
          />
        </label>
        <label>
          Phone*
          <input
            type="tel"
            value={phone}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
            required
            placeholder="10-digit mobile"
          />
        </label>
        <div className="tag-picker">
          <div className="tag-picker__header">
            <span>Interest tags*</span>
            <span className="tag-picker__hint">Choose at least one</span>
          </div>
          <div className="tag-picker__grid">
            {stallTagOptions.map((tagOption) => {
              const active = selectedTags.includes(tagOption.label)
              return (
                <button
                  type="button"
                  key={tagOption.id}
                  onClick={() => toggleTag(tagOption.label)}
                  className={`tag-pill tag-pill--${tagOption.color}${active ? ' active' : ''}`}
                  aria-pressed={active}
                >
                  {tagOption.label}
                </button>
              )
            })}
          </div>
        </div>
        <label>
          Remarks (optional)
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
        </label>
        <div className="form-row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save visitor'}
          </button>
          {justSaved && <span className="success">Saved. Screen ready for next visitor.</span>}
        </div>
        {error && <div className="form-error">{error}</div>}
      </form>

      <div className="hint-row">
        <strong>Coming soon (UI only for now):</strong> QR/vCard scan, visiting card OCR.
      </div>
    </section>
  )
}
