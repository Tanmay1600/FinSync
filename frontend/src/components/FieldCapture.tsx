import { type FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'

const TAG_OPTIONS = ['HNI', 'PMS', 'Channel partner', 'ESOP', 'Treasury']

export function FieldCapture() {
  const { addLead } = useApp()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await addLead({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      interest: note.trim() || undefined,
      tags,
      source: 'field',
      stage: 'met',
    })
    setSaving(false)
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setTags([])
    setNote('')
  }

  return (
    <section className="panel">
      <h2>Field – On-floor Capture</h2>
      <p className="muted">
        For RMs walking the floor: jot key details, tag intent, and we&apos;ll keep the history.
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
        <div className="form-row two">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <div className="chips">
          {TAG_OPTIONS.map((tag) => (
            <button
              type="button"
              key={tag}
              className={tags.includes(tag) ? 'chip active' : 'chip'}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <label>
          Quick note about conversation
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
        <div className="hint-row">Voice notes can be added in a later iteration using on-device recording.</div>
        <div className="form-row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save lead'}
          </button>
        </div>
      </form>
    </section>
  )
}
