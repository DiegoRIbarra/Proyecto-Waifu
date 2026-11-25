import { Player } from '@livliv-dev/player'
import { createSpeech } from '@livliv-dev/player/voice'
import { requestSpeech } from './api.js'

export class AvatarController {
  constructor(canvas, indicator, placeholder) {
    this.canvas = canvas
    this.indicator = indicator
    this.placeholder = placeholder
    this.player = new Player(canvas, { lang: 'es', followPointer: 'canvas' })
    this.speech = createSpeech(this.player)
    this.speech.onIdle = () => this.setSpeaking(false)
    this.currentAudioUrl = null
    this.avatars = []
  }

  async load(avatar) {
    this.placeholder.hidden = false
    this.placeholder.querySelector('p').textContent = `Cargando ${avatar.label}…`
    await this.player.load(`/models/${encodeURIComponent(avatar.file)}`)
    this.placeholder.hidden = true
  }

  setAvatars(avatars) {
    this.avatars = avatars
  }

  unlock() {
    this.speech.unlock()
  }

  async speak(text, avatar) {
    const response = await requestSpeech(text, avatar.voice)
    const audioBlob = await response.blob()
    this.speech.stop()
    if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl)
    this.currentAudioUrl = URL.createObjectURL(audioBlob)
    this.setSpeaking(true)
    this.speech.say(this.currentAudioUrl, {
      onEnd: () => this.setSpeaking(false),
      onFail: () => this.setSpeaking(false),
    })
  }

  stop() {
    this.speech.stop()
    this.setSpeaking(false)
  }

  setSpeaking(isSpeaking) {
    this.indicator.hidden = !isSpeaking
    if (isSpeaking) this.player.setExpression('smile')
    else this.player.setExpression(null)
  }

  dispose() {
    this.stop()
    if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl)
    this.player.dispose()
  }
}
