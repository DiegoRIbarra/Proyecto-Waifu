# Asistente virtual UPV

Aplicación local de chat con RAG sobre `base-conocimiento/`, selector de modelos locales de Ollama y personajes LivLiv animados. La respuesta se reproduce con Edge TTS y sincronización labial del reproductor LivLiv.

## Requisitos

- Python 3.10 o posterior.
- Node.js 20 o posterior.
- [Ollama](https://ollama.com/) con un modelo descargado.
- Navegador moderno con WebGL2; el dictado requiere la Web Speech API.
- Conexión a internet para Edge TTS. El texto de la respuesta se envía al servicio de voz de Microsoft. El reconocimiento de voz también puede depender de un servicio del navegador.

## Ejecutar en desarrollo

En una terminal desde la raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.app:app --reload
```

En otra terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Abre `http://127.0.0.1:5173`. Ollama debe estar activo en `http://127.0.0.1:11434`; el modelo predeterminado es `llama3.1:latest`. Si aún no lo tienes, descárgalo con `ollama pull llama3.1`. Puedes elegir cualquier modelo instalado en la barra superior.

## Ejecutar el frontend compilado

```powershell
Set-Location frontend
npm install
npm run build
Set-Location ..
python -m uvicorn backend.app:app
```

Abre `http://127.0.0.1:8000`.

## Configuración

Edita [`backend/config.json`](backend/config.json) para cambiar el prompt del sistema, dirección de Ollama, modelo predeterminado, cantidad de fragmentos RAG, personajes o las voces de Edge TTS. Los dos personajes incluidos tienen voces femeninas en español distintas (`es-MX-DaliaNeural` y `es-ES-ElviraNeural`). Tema y modelo seleccionado se guardan en el navegador.

El índice RAG carga automáticamente documentos Markdown y JSON de `base-conocimiento/` al iniciar el backend. Divide documentos en fragmentos y los ordena con BM25; las respuestas muestran los archivos recuperados como fuentes. Para que los cambios en la base se reflejen, reinicia el backend.

Los paquetes `.livliv` se sirven sin modificación para conservar sus metadatos de autoría, marca y licencia. Revisa los términos incluidos en cada paquete antes de redistribuir o usar comercialmente los modelos.

## Pruebas

Desde la raíz del repositorio:

```powershell
python -m unittest discover -s backend/tests
```