const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error ?? `Erro HTTP ${response.status}`)
  }

  return payload as T
}

export const campaignApi = {
  getAll: () =>
    request<any[]>('/api/campaigns'),

  start: (campaignId: string) =>
    request<{ success: boolean; totalEnqueued: number }>('/api/campaigns/start', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    }),

  toggle: (campaignId: string, active: boolean) =>
    request<{ success: boolean }>(`/api/campaigns/${campaignId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  remove: (campaignId: string) =>
    request<{ success: boolean; detachedCalls: number; deletedContacts: number }>(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
    }),
}

export const callApi = {
  getAll: () =>
    request<any[]>('/api/calls'),

  getById: (id: string) =>
    request<any>(`/api/calls/${id}`),
}

export const contactApi = {
  import: (campaignId: string, contacts: any[]) =>
    request<{ success: boolean; totalReceived: number; newContacts: number; linked: number }>(
      '/api/contacts/import',
      {
        method: 'POST',
        body: JSON.stringify({ campaignId, contacts }),
      }
    ),
}
