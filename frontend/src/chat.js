import { sendMessage } from './api.js'

export class ChatController {
  constructor({ form, input, messages, modelSelect, avatarProvider, avatarController, toast }) {
    this.form = form
    this.input = input
    this.messages = messages
    this.modelSelect = modelSelect
    this.avatarProvider = avatarProvider
    this.avatarController = avatarController
    this.toast = toast
    this.history = []
    this.busy = false
    this.form.addEventListener('submit', (event) => this.submit(event))
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.form.requestSubmit()
      }
    })
  }

  addMessage(role, text, sources = []) {
    this.messages.querySelector('.welcome-card')?.remove()
    const article = document.createElement('article')
    article.className = `message ${role}`
    const label = document.createElement('span')
    label.className = 'message-label'
    label.textContent = role === 'user' ? 'Tú' : 'Asistente UPV'
    const body = document.createElement('p')
    body.textContent = text
    article.append(label, body)
    if (sources.length) {
      const sourceList = document.createElement('div')
      sourceList.className = 'source-list'
      const heading = document.createElement('span')
      heading.textContent = 'Fuentes consultadas'
      sourceList.append(heading)
      for (const source of sources) {
        const chip = document.createElement('span')
        chip.className = 'source-chip'
        chip.textContent = source.title
        chip.title = source.file
        sourceList.append(chip)
      }
      article.append(sourceList)
    }
    this.messages.append(article)
    this.messages.scrollTop = this.messages.scrollHeight
    return article
  }

  async submit(event) {
    event.preventDefault()
    if (this.busy) return
    const message = this.input.value.trim()
    if (!message) return
    if (!this.modelSelect.value) {
      this.toast('Instala o inicia Ollama y descarga un modelo local antes de enviar preguntas.')
      return
    }
    this.avatarController.unlock()
    const userMessage = { role: 'user', content: message }
    this.addMessage('user', message)
    this.history.push(userMessage)
    this.input.value = ''
    this.input.dispatchEvent(new Event('input'))
    this.setBusy(true)
    const pending = this.addMessage('assistant', 'Estoy consultando la base de conocimiento…')
    try {
      const result = await sendMessage(
        message,
        this.modelSelect.value,
        this.history.slice(0, -1).slice(-12),
      )
      pending.remove()
      this.addMessage('assistant', result.answer, result.sources)
      this.history.push({ role: 'assistant', content: result.answer })
      try {
        await this.avatarController.speak(result.answer, this.avatarProvider())
      } catch (error) {
        this.toast(`Respuesta lista, pero no se pudo generar la voz: ${error.message}`)
      }
    } catch (error) {
      pending.remove()
      this.history.pop()
      this.toast(error.message)
      this.addMessage('assistant', `No pude completar la consulta. ${error.message}`)
    } finally {
      this.setBusy(false)
      this.input.focus()
    }
  }

  setBusy(value) {
    this.busy = value
    this.form.querySelector('#send-button').disabled = value
    this.form.querySelector('#send-button').textContent = value ? '…' : '↑'
  }

  clear() {
    this.avatarController.stop()
    this.history = []
    this.messages.replaceChildren()
    const welcome = document.createElement('div')
    welcome.className = 'welcome-card'
    welcome.innerHTML = '<span class="welcome-icon">✦</span><p>Estoy aquí para orientarte con información de la UPV.</p>'
    this.messages.append(welcome)
    this.input.focus()
  }
}
