import Dexie, { type Table } from 'dexie'

export type LeadStage = 'met' | 'followup' | 'engaged' | 'meeting' | 'outcome'

export interface Lead {
  id?: number
  email?: string
  phone?: string
  name: string
  company?: string
  interest?: string
  audioTranscript?: string
  audioNoteId?: number
  visitingCardImage?: string
  audioUrl?: string
  imageUrl?: string
  tagIds?: number[]
  tags: string[]
  source: 'stall' | 'field'
  stage: LeadStage
  createdAt: number
  updatedAt: number
  history: LeadHistoryEntry[]
  /** For optimistic UI  true until persisted */
  pending?: boolean
  /** Local queue identifier to reconcile with server sync */
  pendingLocalId?: string
}

export interface LeadHistoryEntry {
  type: 'check-in' | 'voice-note' | 'scan' | 'tag'
  timestamp: number
  payload?: {
    transcript?: string
    audioBlobRef?: string
    tags?: string[]
  }
}

export interface AudioNote {
  id?: number
  blob: Blob
  mimeType: string
  createdAt: number
}

const DB_NAME = 'FinSyncDB'
const DB_VERSION = 3

export class FinSyncDexie extends Dexie {
  leads!: Table<Lead, number>
  audioNotes!: Table<AudioNote, number>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      leads: '++id, email, phone, name, createdAt, source, stage',
      audioNotes: '++id, createdAt',
    })
  }
}

export const db = new FinSyncDexie()
