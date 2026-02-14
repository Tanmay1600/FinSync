import { api } from './api'
import { db, type Lead } from './db'
import { OfflineQueue, offlineDB, type QueuedOperation } from './offline-queue'
import { stallTagOptions } from '../data/stallTags'

const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dyl2ptmmp',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '213394372734892',
  apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || 'Qh6l_lYLhoAf6HsnGHUXLd4bUmI',
}

export class SyncService {
  private static instance: SyncService
  private queue: OfflineQueue
  private isOnline: boolean = navigator.onLine
  private listeners: Set<(isOnline: boolean) => void> = new Set()
  private isSyncing: boolean = false
  private geminiUnavailable: boolean = false
  
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  constructor() {
    this.queue = OfflineQueue.getInstance()
    this.setupOnlineListener()
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('[Sync] Back online - starting sync')
      this.isOnline = true
      this.notifyListeners(true)
      this.syncPendingOperations()
    })

    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline')
      this.isOnline = false
      this.notifyListeners(false)
    })
  }

  onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline))
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) {
      console.log('[Sync] Offline - skipping sync')
      return
    }

    if (this.isSyncing) {
      console.log('[Sync] Sync already in progress - skipping reentry')
      return
    }

    this.isSyncing = true

    await this.queue.setSyncing(true)
    console.log('[Sync] Starting sync process')

    try {
      const operations = await this.queue.getPendingOperations()
      console.log(`[Sync] Found ${operations.length} pending operations`)

      for (const operation of operations) {
        try {
          await this.processOperation(operation)
          await this.queue.removeOperation(operation.id!)
          console.log(`[Sync] Successfully synced operation: ${operation.type}`)
        } catch (error) {
          console.error(`[Sync] Failed to sync operation ${operation.type}:`, error)
          await this.queue.incrementRetry(operation.id!, error instanceof Error ? error.message : 'Unknown error')
        }
      }

      // Remove any failed operations that exceeded retries
      await this.queue.clearFailedOperations()

      const remaining = await this.queue.getOperationCount()
      if (remaining === 0) {
        await this.clearLocalStoresAfterSync()
      }

      await this.queue.setLastSync()
      console.log('[Sync] Sync completed successfully')
    } catch (error) {
      console.error('[Sync] Sync process failed:', error)
    } finally {
      await this.queue.setSyncing(false)
      this.isSyncing = false
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_LEAD':
        await this.syncCreateLead(operation)
        break
      case 'UPDATE_LEAD':
        await this.syncUpdateLead(operation)
        break
      case 'UPDATE_STAGE':
        await this.syncUpdateStage(operation)
        break
      case 'ADD_HISTORY':
        await this.syncAddHistory(operation)
        break
      default:
        console.warn(`[Sync] Unknown operation type: ${operation.type}`)
    }
  }

  private async syncCreateLead(operation: QueuedOperation): Promise<void> {
    const leadData = operation.payload as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'> & { localId: string }
    
    try {
      const tagIds = this.mapTagLabelsToIds(leadData.tags || [])

      if (!tagIds.length) {
        throw new Error('No tag IDs mapped for offline lead')
      }
      const isFieldLead = leadData.source === 'field'

      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (isFieldLead && leadData.visitingCardImage) {
        imageUrl = await this.uploadToCloudinary(leadData.visitingCardImage, 'field_cards')
      }

      if (isFieldLead && leadData.audioNoteId) {
        const note = await db.audioNotes.get(leadData.audioNoteId)
        if (note?.blob) {
          audioUrl = await this.uploadToCloudinary(note.blob, 'field_audio')
        }
      }

      let finalName: string | undefined
      let finalEmail: string | undefined
      let finalPhone: string | undefined
      let finalRemarks = leadData.interest

      if (isFieldLead && leadData.visitingCardImage) {
        const geminiResult = await this.generateGeminiSummary({
          imageDataUrl: leadData.visitingCardImage,
        })

        if (geminiResult) {
          finalName = geminiResult.name ?? finalName
          finalEmail = geminiResult.email ?? finalEmail
          finalPhone = geminiResult.phone ?? finalPhone
          if (geminiResult.remarks) finalRemarks = geminiResult.remarks
        }
      }

      // Fallback to any captured fields only if Gemini did not provide them
      if (!finalName) finalName = leadData.name || 'Visitor'
      if (!finalEmail) finalEmail = leadData.email
      if (!finalPhone) finalPhone = leadData.phone

      if (!finalPhone) {
        // Generate a unique numeric fallback to avoid duplicate-key failures
        const digitsFromLocal = (leadData.pendingLocalId || leadData.localId || '').replace(/\D/g, '')
        const tail = (digitsFromLocal || Date.now().toString()).slice(-9)
        finalPhone = `9${tail}`.slice(0, 10)
      }

      // Clean phone: remove + and any non-digits, backend expects exactly 10 digits
      if (finalPhone) {
        finalPhone = finalPhone.replace(/\D/g, '').slice(-10)
      }

      if (!finalEmail) {
        // Backend requires non-null email; synthesize a temp one based on phone/local id
        const token = (finalPhone || leadData.pendingLocalId || Date.now().toString()).replace(/\W/g, '') || 'visitor'
        finalEmail = `${token}@temp.email`
      }

      console.log('[Sync] Sending to createInteraction:', {
        name: finalName,
        mobNo: finalPhone,
        email: finalEmail,
        tagIds,
        mode: isFieldLead ? 'field' : 'stall',
        hasImage: Boolean(imageUrl),
        hasAudio: Boolean(audioUrl)
      })

      const result = await api.createInteraction({
        name: finalName,
        mobNo: finalPhone,
        email: finalEmail,
        tagIds,
        remarks: finalRemarks,
        mode: isFieldLead ? 'field' : 'stall',
        image_url: imageUrl,
        audio_url: audioUrl,
      })

      console.log('[Sync] createInteraction result:', result)
      
      // Update local record (by pendingLocalId fallback to phone/email) and remove pending flag
      let localLead = await db.leads
        .filter((lead) => lead.pendingLocalId === leadData.localId)
        .first()

      if (!localLead && leadData.phone) {
        localLead = await db.leads.where('phone').equals(leadData.phone).first()
      }
      if (!localLead && leadData.email) {
        localLead = await db.leads.where('email').equals(leadData.email).first()
      }

      if (localLead) {
        await db.leads.update(localLead.id!, {
          pending: false,
          pendingLocalId: undefined,
          updatedAt: Date.now()
        })
      }
      
      console.log('[Sync] Lead created on server via interaction endpoint')
    } catch (error) {
      throw new Error(`Failed to create lead: ${error}`)
    }
  }

  private mapTagLabelsToIds(tags: string[]): number[] {
    if (!tags || tags.length === 0) return []
    const lookup = new Map(stallTagOptions.map((t) => [t.label, t.id]))
    return tags.map((label) => lookup.get(label)).filter((id): id is number => typeof id === 'number')
  }

  private async syncUpdateLead(operation: QueuedOperation): Promise<void> {
    const { id, updates } = operation.payload as { id: number; updates: Partial<Lead> }
    
    try {
      await api.updateLead(id, updates)
      console.log(`[Sync] Lead ${id} updated on server`)
    } catch (error) {
      throw new Error(`Failed to update lead: ${error}`)
    }
  }

  private async syncUpdateStage(operation: QueuedOperation): Promise<void> {
    const { id, stage } = operation.payload as { id: number; stage: Lead['stage'] }
    
    try {
      await api.updateLeadStage(id, stage)
      console.log(`[Sync] Lead ${id} stage updated to ${stage}`)
    } catch (error) {
      throw new Error(`Failed to update lead stage: ${error}`)
    }
  }

  private async syncAddHistory(operation: QueuedOperation): Promise<void> {
    const { id, entry } = operation.payload as { id: number; entry: Lead['history'][number] }
    
    try {
      await api.addLeadHistory(id, entry)
      console.log(`[Sync] History added to lead ${id}`)
    } catch (error) {
      throw new Error(`Failed to add lead history: ${error}`)
    }
  }

  async queueCreateLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'pending'>): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'CREATE_LEAD',
      payload: { ...leadData, localId: `temp_${Date.now()}` },
      maxRetries: 3
    })

    // If online, try to sync immediately
    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  async ensurePendingLeadsQueued(leads: Lead[]): Promise<void> {
    const pendingLeads = leads.filter((l) => l.pending)
    if (pendingLeads.length === 0) return

    const queuedOps = await this.queue.getPendingOperations()

    for (const lead of pendingLeads) {
      const alreadyQueued = queuedOps.some((op) => {
        const payload = op.payload as any
        return (
          payload?.localId === lead.pendingLocalId ||
          (payload?.phone && lead.phone && payload.phone === lead.phone) ||
          (payload?.email && lead.email && payload.email === lead.email)
        )
      })

      if (alreadyQueued) continue

      const queueId = await this.queueCreateLead({
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        tags: lead.tags,
        source: lead.source,
        interest: lead.interest,
      })

      if (lead.id) {
        await db.leads.update(lead.id, { pendingLocalId: queueId })
      }
    }
  }

  async queueUpdateStage(id: number, stage: Lead['stage']): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'UPDATE_STAGE',
      payload: { id, stage },
      maxRetries: 3
    })

    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  async queueAddHistory(id: number, entry: Lead['history'][number]): Promise<string> {
    const localId = await this.queue.addOperation({
      type: 'ADD_HISTORY',
      payload: { id, entry },
      maxRetries: 3
    })

    if (this.isOnline) {
      setTimeout(() => this.syncPendingOperations(), 100)
    }

    return localId
  }

  private async uploadToCloudinary(input: Blob | string, folder: string): Promise<string | undefined> {
    const { cloudName, apiKey, apiSecret } = CLOUDINARY_CONFIG
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('[Sync] Cloudinary config missing - skipping upload')
      return undefined
    }

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
      const formData = new FormData()

      const file = typeof input === 'string' ? await this.dataUrlToBlob(input) : input

      const timestamp = Math.floor(Date.now() / 1000)
      const paramsToSign = folder ? `folder=${folder}&timestamp=${timestamp}` : `timestamp=${timestamp}`
      const signature = await this.sha1Hex(`${paramsToSign}${apiSecret}`)

      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)
      if (folder) {
        formData.append('folder', folder)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Cloudinary upload failed')
      }

      return data.secure_url as string
    } catch (error) {
      console.error('[Sync] Cloudinary upload error:', error)
      return undefined
    }
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const [meta, content] = dataUrl.split(',')
    const isBase64 = meta.includes('base64')
    const byteString = isBase64 ? atob(content) : decodeURIComponent(content)
    const mimeMatch = meta.match(/data:(.*?);/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeType })
  }

  private async sha1Hex(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  private async generateGeminiSummary(params: {
    imageDataUrl?: string
  }): Promise<{ name?: string; email?: string; phone?: string; remarks?: string } | undefined> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || this.geminiUnavailable) {
      return undefined
    }

  const prompt = `You are a data extractor. Your ONLY source of truth is the INLINE BUSINESS CARD IMAGE. Ignore any other inputs. Output STRICT JSON only.

Schema: {"name": string|null, "email": string|null, "phone": string|null, "remarks": string|null}.

Rules:
- "remarks" is a brief summary from the card, <= 120 chars.
- "phone" must be digits with optional leading '+'.
- If a field is absent on the card, set it to null. Do not guess or invent.
- Use exact text from the card.

Return ONLY the JSON, no prose, no code fences.`

    try {
      // Use Gemini 2.5 Pro vision-capable endpoint (AI Studio)
      const endpoints = [
        'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent',
      ]

      // Inline image data if available (data URL)
      if (params.imageDataUrl?.startsWith('data:')) {
        const [meta, data] = params.imageDataUrl.split(',')
        const mimeMatch = meta.match(/data:(.*?);/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
        
        for (const base of endpoints) {
          const url = `${base}?key=${apiKey}`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: data,
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024
              }
            })
          })

          if (response.status === 404 || response.status === 403) {
            this.geminiUnavailable = true
            console.warn(`[Sync] Gemini responded with status ${response.status}. Disabling for this session.`)
            continue
          }

          if (!response.ok) {
            const errorBody = await response.text()
            console.error('[Sync] Gemini error response:', {
              status: response.status,
              statusText: response.statusText,
              body: errorBody
            })
            continue
          }

          const responseData = await response.json()
          console.log('[Sync] Gemini raw response:', responseData)
          const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text
          console.log('[Sync] Gemini extracted text:', text)
          if (typeof text === 'string') {
            try {
              const parsed = JSON.parse(text)
              console.log('[Sync] Gemini parsed JSON:', parsed)
              return {
                name: parsed?.name ?? undefined,
                email: parsed?.email ?? undefined,
                phone: parsed?.phone ?? undefined,
                remarks: parsed?.remarks ?? undefined,
              }
            } catch (err) {
              // Try to find JSON substring
              const match = text.match(/\{[\s\S]*\}/)
              if (match) {
                try {
                  const parsed = JSON.parse(match[0])
                  console.log('[Sync] Gemini parsed JSON (from substring):', parsed)
                  return {
                    name: parsed?.name ?? undefined,
                    email: parsed?.email ?? undefined,
                    phone: parsed?.phone ?? undefined,
                    remarks: parsed?.remarks ?? undefined,
                  }
                } catch (e) {
                  console.warn('[Sync] Gemini response not JSON parsable')
                }
              }
            }
          }
        }
      }

      return undefined
    } catch (error) {
      console.error('[Sync] Gemini summary failed:', error)
      this.geminiUnavailable = true
      return undefined
    }
  }

  private async clearLocalStoresAfterSync(): Promise<void> {
    await db.leads.clear()
    await db.audioNotes.clear()
    await offlineDB.operations.clear()
    await offlineDB.syncStatus.clear()
    console.log('[Sync] Cleared local IndexedDB caches after successful sync')
  }

  getOnlineStatus(): boolean {
    return this.isOnline
  }

  async getSyncStatus() {
    return await this.queue.getSyncStatus()
  }

  async clearFailedOperations() {
    return await this.queue.clearFailedOperations()
  }
}