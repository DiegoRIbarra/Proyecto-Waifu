export class SpeechInput {
  constructor({ input, button, status, onTranscript }) {
    this.input = input
    this.button = button
    this.status = status
    this.onTranscript = onTranscript
    this.recognition = null
    this.listening = false
    this.inputPrefix = ''

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (Recognition) {
      this.recognition = new Recognition()
      this.recognition.lang = 'es-MX'
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('')
        if (transcript) {
          const separator = this.inputPrefix.trim() ? ' ' : ''
          this.input.value = `${this.inputPrefix}${separator}${transcript}`.trimStart()
          this.input.dispatchEvent(new Event('input'))
          this.onTranscript()
        }
      }
      this.recognition.onstart = () => {
        this.inputPrefix = this.input.value.trimEnd()
      }
      this.recognition.onerror = (event) => {
        this.setListening(false)
        this.status.textContent = `Error de reconocimiento: ${event.error}`
      }
      this.recognition.onend = () => this.setListening(false)
    } else {
      this.button.disabled = true
      this.button.title = 'El reconocimiento de voz no está disponible en este navegador.'
      this.status.textContent = 'Dictado no disponible en este navegador; puedes escribir.'
    }

    this.button.addEventListener('click', () => this.toggle())
  }

  toggle() {
    if (!this.recognition) return
    if (this.listening) {
      this.recognition.stop()
      this.setListening(false)
    } else {
      this.input.focus()
      try {
        this.recognition.start()
        this.setListening(true)
      } catch (error) {
        this.status.textContent = `No se pudo iniciar el dictado: ${error.message}`
      }
    }
  }

  setListening(value) {
    this.listening = value
    this.button.classList.toggle('recording', value)
    this.button.setAttribute('aria-label', value ? 'Detener dictado' : 'Iniciar dictado')
    this.status.textContent = value
      ? 'Escuchando… Puedes corregir el texto antes de enviarlo.'
      : 'Puedes editar la transcripción antes de enviarla'
  }

  stop() {
    if (this.listening && this.recognition) this.recognition.stop()
  }
}
