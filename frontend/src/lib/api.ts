const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface User {
  id: number
  name: string
  email: string
  mobno: string
  orgId: number
  role: 'admin' | 'agent'
  created_at: string
  updated_at: string
}

export interface Organization {
  id: number
  name: string
  description: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  message: string
  user: User
  organization: Organization
  token: string
}

export interface RegisterInput {
  name: string
  email: string
  mobNo: string
  password: string
  orgName: string
  orgDescription?: string
  orgWebsite?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface InviteInput {
  agent_name: string
  agent_email: string
  agent_mobno: string
  frontend_url: string
}

export interface SetPasswordInput {
  invite_token: string
  password: string
}

export interface ApiError {
  error?: string
  success?: boolean
}

// Lead related interfaces
export interface CreateLeadInput {
  name: string
  company?: string
  email?: string
  phone?: string
  tags: string[]
  source: 'stall' | 'field'
  interest?: string
}

export interface LeadResponse {
  id: number
  message?: string
}

export interface CreateInteractionInput {
  name: string
  mobNo: string
  email?: string
  tagIds: number[]
  remarks?: string
  mode?: 'stall' | 'field'
  image_url?: string
  audio_url?: string
}

class ApiService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    return data
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    return data
  }

  async inviteAgent(input: InviteInput): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await fetch(`${API_BASE_URL}/auth/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send invitation')
    }

    return data
  }

  async setPassword(input: SetPasswordInput): Promise<{ success: boolean; data: AuthResponse & { message: string } }> {
    const response = await fetch(`${API_BASE_URL}/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to set password')
    }

    return data
  }

  async healthCheck(): Promise<{ status: string; message: string; database: string }> {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.json()
  }

  // Lead Operations
  async createLead(leadData: CreateLeadInput): Promise<LeadResponse> {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(leadData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create lead')
    }

    return data
  }

  // Interactions (used for stall sync)
  async createInteraction(input: CreateInteractionInput): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Not logged in: missing auth token')
    }

    const response = await fetch(`${API_BASE_URL}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        ...input,
        mode: input.mode || 'stall',
      }),
    })

    let data: any = null
    let text: string | undefined
    try {
      data = await response.json()
    } catch (err) {
      try {
        text = await response.text()
      } catch {}
    }

    if (!response.ok) {
      const detail = data?.error || data?.message || text || response.statusText
      console.error('[API] createInteraction failed', {
        status: response.status,
        detail,
        body: data || text,
      })
      throw new Error(detail || 'Failed to create interaction')
    }

    return data
  }

  async updateLead(id: number, updates: Partial<CreateLeadInput>): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(updates),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update lead')
    }

    return data
  }

  async updateLeadStage(id: number, stage: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ stage }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update lead stage')
    }

    return data
  }

  async addLeadHistory(id: number, entry: any): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ entry }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add lead history')
    }

    return data
  }

  // Network utilities
  async isOnline(): Promise<boolean> {
    if (!navigator.onLine) return false
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'HEAD',
        cache: 'no-cache',
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export const api = new ApiService()
