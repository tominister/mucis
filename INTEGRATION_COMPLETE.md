# 🎵 SoundSketch.tech - ElevenLabs + Gemini Integration Complete

## ✅ Implementation Summary

### **Backend API Endpoints** (`backend/server.js`)

#### 1️⃣ **POST /api/upload-audio**
- Accepts audio blob from beatbox recording
- Returns mock rhythm data with syllables and timestamps
- **TODO**: Integrate actual ElevenLabs phoneme/timestamp API when available

#### 2️⃣ **POST /api/generate-pattern**
- Receives rhythm data from audio analysis
- Maps syllables to 16-step drum pattern
- Optionally enhances with Gemini AI for style
- Returns complete drum pattern JSON

#### 3️⃣ **POST /api/gemini/process-prompt**
- Processes DJ modification prompts
- Uses Gemini 2.0 Flash to intelligently modify patterns
- Returns modified patterns with explanation

#### 4️⃣ **POST /api/elevenlabs/producer-tag**
- Generates producer tag audio using ElevenLabs
- Uses female voice (Bella) for professional sound
- Returns audio blob for playback

---

### **Frontend API Client** (`frontend/js/api-client.js`)

#### New Methods Added:
- `uploadBeatboxAudio(audioBlob)` - Upload and analyze beatbox recording
- `generatePatternFromRhythm(rhythmData, style)` - Generate drum pattern from rhythm
- `generateProducerTag(tag)` - Create producer tag audio
- `mockRhythmData()` - Mock data for testing
- `mockPatternGeneration()` - Mock pattern for testing

---

### **Audio Engine** (`frontend/js/audio-engine.js`)

#### Producer Tag Integration:
- `setProducerTag(audioURL)` - Set producer tag audio
- `setProducerTagSpeech(text)` - Fallback TTS for producer tag
- Producer tag plays automatically at step 0 of each loop
- Supports both ElevenLabs audio and browser SpeechSynthesis fallback

---

### **Main App** (`frontend/js/app.js`)

#### New Features:
- Producer tag generation UI and logic
- Event listeners for all new controls
- Integration with audio engine for tag playback
- Improved beat generation from classification

---

### **HTML UI** (`frontend/index.html`)

#### Section 5: Producer Tag
```html
<section class="producer-tag-section">
    <h2>🎤 Section 5: Producer Tag</h2>
    <div class="producer-tag-controls">
        <input type="text" id="producerTag" placeholder="Enter your producer tag" maxlength="50">
        <button id="generateTagBtn" class="btn btn-primary">🎵 Generate Tag</button>
    </div>
</section>
```

---

## 🔄 Data Flow

### Beatbox → Pattern Pipeline:

```
1. User beatboxes into microphone
   ↓
2. Audio recorded as blob
   ↓
3. POST /api/upload-audio
   ↓
4. [ElevenLabs] Analyze phonemes & timestamps (currently mocked)
   ↓
5. Return rhythm data:
   {
     bpm: 120,
     syllables: [
       { phoneme: 'b', time: 0.0, type: 'kick' },
       { phoneme: 'ts', time: 0.25, type: 'hihat' },
       ...
     ]
   }
   ↓
6. POST /api/generate-pattern
   ↓
7. Map syllables to 16-step grid
   ↓
8. [Optional] Enhance with Gemini AI
   ↓
9. Return pattern:
   {
     bpm: 125,
     kick: [true, false, ...],
     snare: [false, false, ...],
     ...
   }
   ↓
10. Update Tone.js audio engine
   ↓
11. Play beat with producer tag!
```

---

## 🎯 Syllable → Drum Mapping

| Phoneme | Drum Type | Description |
|---------|-----------|-------------|
| `b`, `p` | Kick | Bass/low sounds |
| `k`, `t` | Snare | Sharp, crisp sounds |
| `ts`, `s`, `sh` | Hi-hat | High frequency sounds |
| `pf`, `ch` | Clap | Mid-range percussive |
| `crash` | Cymbal | Accent sounds |
| `shake`, `roll` | Perc | Texture sounds |

---

## 🚀 How to Use

### 1. Start the Backend:
```bash
cd backend
node server.js
```

### 2. Open Frontend:
Navigate to `http://localhost:3001` in your browser

### 3. Workflow:
1. **Section 1**: Click "Start Recording" and beatbox your rhythm
2. **Section 2**: AI analyzes and shows confidence levels
3. **Section 3**: Generated beat plays automatically
4. **Section 4**: Modify beat with DJ prompts
5. **Section 5**: Generate your producer tag

---

## 🔑 API Keys Required

Create `.env` file in root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
PORT=3001
```

---

## 📝 TODO / Future Enhancements

### High Priority:
- [ ] Integrate actual ElevenLabs phoneme/timestamp API
- [ ] Add real-time audio analysis visualization
- [ ] Export beat as MIDI file
- [ ] Save/load beat presets

### Medium Priority:
- [ ] Add more drum samples
- [ ] Implement swing/groove quantization
- [ ] Add effects (reverb, delay, compression)
- [ ] Multi-track recording

### Low Priority:
- [ ] Social sharing features
- [ ] Beat marketplace
- [ ] Collaborative beatmaking
- [ ] Mobile app version

---

## 🎨 Tech Stack

- **Frontend**: Vanilla JS, Tone.js, TensorFlow.js
- **Backend**: Node.js, Express, Multer
- **AI**: Gemini 2.0 Flash, ElevenLabs TTS
- **Audio**: Tone.js, Web Audio API
- **ML**: Teachable Machine Audio Model

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | API endpoints for Gemini + ElevenLabs |
| `frontend/js/api-client.js` | Frontend API communication |
| `frontend/js/audio-engine.js` | Tone.js beat playback engine |
| `frontend/js/app.js` | Main app logic & UI |
| `frontend/js/ai-classifier.js` | Audio classification |
| `frontend/index.html` | Main UI |
| `frontend/styles.css` | Celestial theme styling |

---

## 🎉 Features Implemented

✅ Beatbox recording & analysis  
✅ AI-powered beat generation  
✅ 16-step sequencer with 6 drum instruments  
✅ DJ modifications with Gemini AI  
✅ Producer tag generation with ElevenLabs  
✅ BPM ramping & tempo control  
✅ Sample swapping for each drum  
✅ Visual beat pattern editor  
✅ Real-time step visualization  
✅ Mock data for offline testing  

---

## 🐛 Known Issues

1. **ElevenLabs Phoneme API**: Currently using mock data - needs actual API integration
2. **Browser Compatibility**: Chrome/Edge recommended for Web Audio API
3. **Audio Context**: Requires user interaction to activate (browser security)

---

## 💡 Tips

- **Best Results**: Beatbox clearly with distinct sounds
- **BPM Detection**: Works best with steady rhythm
- **Producer Tags**: Keep them short (2-4 words)
- **DJ Prompts**: Be specific (e.g., "add more hi-hats on off-beats")

---

Built with ❤️ for HackTX 2025 🚀
