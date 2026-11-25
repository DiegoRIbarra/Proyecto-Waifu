import './styles.css'
import { fetchJson } from './api.js'
import { AvatarController } from './avatar.js'
import { ChatController } from './chat.js'
import { SpeechInput } from './speech-input.js'
import {
  getSavedAvatar,
  getSavedTheme,
  populateModels,
  saveAvatar,
  saveModel,
  setTheme,
} from './settings.js'

const byId = (id) => document.getElementById(id)
const toast = (message) => {
  const element = byId('toast')
  element.textContent = message
  element.classList.add('visible')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => element.classList.remove('visible'), 5000)
}

const modelSelect = byId('model-select')
const settingsModelSelect = byId('settings-model-select')
const avatarSelect = byId('avatar-select')
const avatarController = new AvatarController(
  byId('avatar-canvas'),
  byId('speaking-indicator'),
  byId('avatar-placeholder'),
)

let avatars = []
let selectedAvatar
const chat = new ChatController({
  form: byId('chat-form'),
  input: byId('message-input'),
  messages: byId('messages'),
  modelSelect,
  avatarProvider: () => selectedAvatar,
  avatarController,
  toast,
})

const input = new SpeechInput({
  input: byId('message-input'),
  button: byId('mic-button'),
  status: byId('input-status'),
  onTranscript: () => {},
})

function setInputMode(mode) {
  const voiceMode = mode === 'voice'
  byId('voice-mode').classList.toggle('active', voiceMode)
  byId('text-mode').classList.toggle('active', !voiceMode)
  byId('voice-mode').setAttribute('aria-pressed', String(voiceMode))
  byId('text-mode').setAttribute('aria-pressed', String(!voiceMode))
  byId('mic-button').hidden = !voiceMode
  byId('message-input').placeholder = voiceMode
    ? 'Dicta o escribe tu pregunta; puedes corregirla antes de enviarla…'
    : 'Escribe tu pregunta…'
  if (!voiceMode) input.stop()
}

function selectAvatar(avatar) {
  selectedAvatar = avatar
  avatarSelect.value = avatar.id
  byId('avatar-name').textContent = avatar.label
  byId('voice-label').textContent = `Voz: ${avatar.voice_label}`
  saveAvatar(avatar)
  avatarController.load(avatar).catch((error) => {
    byId('avatar-placeholder').querySelector('p').textContent = `No se pudo cargar el personaje: ${error.message}`
    toast(`Error al cargar el avatar: ${error.message}`)
  })
}

function updateConnection(connected, message) {
  byId('connection-dot').classList.toggle('connected', connected)
  byId('connection-label').textContent = message
}

async function initialize() {
  setTheme(getSavedTheme())
  byId('theme-select').value = getSavedTheme()
  try {
    const config = await fetchJson('/api/settings')
    avatars = config.avatars
    avatarController.setAvatars(avatars)
    byId('prompt-preview').textContent = config.system_prompt
    for (const avatar of avatars) avatarSelect.add(new Option(`${avatar.label} · ${avatar.voice_label}`, avatar.id))
    selectAvatar(getSavedAvatar(avatars))
    try {
      const result = await fetchJson('/api/models')
      populateModels([modelSelect, settingsModelSelect], result.models, config.default_model)
      updateConnection(true, `${result.models.length} modelo(s) local(es) disponibles`)
    } catch (error) {
      populateModels([modelSelect, settingsModelSelect], [], config.default_model)
      updateConnection(false, 'Ollama no está disponible')
      toast(error.message)
    }
  } catch (error) {
    updateConnection(false, 'No se pudo conectar con el servidor')
    byId('avatar-placeholder').querySelector('p').textContent = error.message
    toast(error.message)
  }
}

byId('voice-mode').addEventListener('click', () => setInputMode('voice'))
byId('text-mode').addEventListener('click', () => setInputMode('text'))
byId('clear-chat').addEventListener('click', () => chat.clear())
byId('theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  setTheme(theme)
  byId('theme-select').value = theme
})
byId('theme-select').addEventListener('change', (event) => setTheme(event.target.value))
byId('settings-toggle').addEventListener('click', () => byId('settings-dialog').showModal())
byId('avatar-menu-toggle').addEventListener('click', () => {
  byId('avatar-picker-wrap').classList.toggle('open')
})
avatarSelect.addEventListener('change', () => {
  const avatar = avatars.find((item) => item.id === avatarSelect.value)
  if (avatar) selectAvatar(avatar)
})
for (const select of [modelSelect, settingsModelSelect]) {
  select.addEventListener('change', () => {
    modelSelect.value = select.value
    settingsModelSelect.value = select.value
    saveModel(select.value)
  })
}
document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    byId('message-input').value = button.dataset.prompt
    byId('message-input').focus()
  })
})
byId('message-input').addEventListener('input', (event) => {
  event.target.style.height = 'auto'
  event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`
})
window.addEventListener('beforeunload', () => avatarController.dispose())

initialize()
