const THEME_KEY = 'asistente-upv-theme'
const MODEL_KEY = 'asistente-upv-model'
const AVATAR_KEY = 'asistente-upv-avatar'

export function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark'
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

export function populateModels(selects, models, defaultModel) {
  const saved = localStorage.getItem(MODEL_KEY)
  const selected = models.includes(saved) ? saved : models.includes(defaultModel) ? defaultModel : models[0]
  for (const select of selects) {
    select.replaceChildren()
    if (!models.length) {
      const option = new Option('Sin modelos locales', '')
      select.add(option)
      select.disabled = true
      continue
    }
    select.disabled = false
    for (const model of models) select.add(new Option(model, model))
    select.value = selected
  }
}

export function saveModel(model) {
  if (model) localStorage.setItem(MODEL_KEY, model)
}

export function getSavedAvatar(avatars) {
  const saved = localStorage.getItem(AVATAR_KEY)
  return avatars.find((avatar) => avatar.id === saved) || avatars[0]
}

export function saveAvatar(avatar) {
  localStorage.setItem(AVATAR_KEY, avatar.id)
}
