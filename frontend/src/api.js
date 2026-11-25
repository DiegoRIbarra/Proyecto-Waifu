export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) {
    let detail = `Solicitud fallida (${response.status})`
    try {
      const body = await response.json()
      detail = body.detail || detail
    } catch {
      // Keep the HTTP status as the user-facing error when no JSON body exists.
    }
    throw new Error(detail)
  }
  return response.json()
}

export async function sendMessage(message, model, history) {
  return fetchJson('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, model, history }),
  })
}

export async function requestSpeech(text, voice) {
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!response.ok) {
    let detail = `No se pudo generar audio (${response.status})`
    try {
      detail = (await response.json()).detail || detail
    } catch {
      // Keep the HTTP status as the user-facing error when no JSON body exists.
    }
    throw new Error(detail)
  }
  return response
}
