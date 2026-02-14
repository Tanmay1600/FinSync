import Dexie, { type Table } from 'dexie'

export type LeadStage = 'met' | 'followup' | 'engaged' | 'meeting' | 'outcome'

export interface Lead {
  id?: number
  email?: string
  phone?: string
  name: string
  company?: string
  interest?: string
  tags: string[]
  source: 'stall' | 'field'
  stage: LeadStage
  createdAt: number
  updatedAt: number
  history: LeadHistoryEntry[]
  /** For optimistic UI  true until persisted */
  pending?: boolean
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

const DB_NAME = 'FinSyncDB'
const DB_VERSION = 2

export class FinSyncDexie extends Dexie {
  leads!: Table<Lead, number>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      leads: '++id, email, phone, name, createdAt, source, stage',
    })
  }
}

export const db = new FinSyncDexie()
