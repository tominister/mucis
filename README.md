# StarTracks AI Music

StarTracks is an experimental browser-based music tool that turns beatboxing into editable drum patterns. It combines client-side audio classification, a Tone.js sequencer, and natural-language beat controls.

## What it demonstrates

- Microphone capture and real-time audio processing with the Web Audio API
- Kick, snare, hi-hat, and clap classification with TensorFlow.js
- Sixteen-step beat generation and playback with Tone.js
- Optional Gemini-powered natural-language pattern changes
- Optional ElevenLabs producer-tag generation

## Architecture

```text
Microphone → audio classifier → drum probabilities → step sequencer
                                                ↘ Gemini beat edits
                                                ↘ optional voice tag
```

The repository includes mock fallbacks for demonstrations without external API keys. A configured integration should not be confused with a guaranteed hosted service.

## Tech stack

- Vanilla JavaScript and Web Audio API
- TensorFlow.js and Teachable Machine
- Tone.js
- Node.js and Express
- Optional Gemini and ElevenLabs APIs

## Run locally

```bash
git clone https://github.com/tominister/startracks-ai-music.git
cd startracks-ai-music
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`. External AI features require their corresponding API keys; the core demonstration includes fallback behavior when keys are unavailable.

## Project structure

- `frontend/` — recording interface, sequencer, and browser audio logic
- `backend/` — Express API endpoints
- `models/` — audio-classification model setup
- `docs/` — setup and demonstration notes

## Limitations

- Classification quality depends on the custom audio model and recording environment.
- Natural-language edits and voice generation require configured third-party services.
- The repository is a hackathon prototype, not a hosted production music platform.
