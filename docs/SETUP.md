# 🎵 SoundSketch.tech - Setup Guide

Welcome to **SoundSketch.tech** - Transform your beatbox into AI-powered music!

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
PORT=3000
FRONTEND_URL=http://localhost:8080
```

### 3. Start the Application
```bash
# Start backend server
npm start

# OR for development with auto-reload
npm run dev
```

### 4. Open in Browser
Visit: http://localhost:3000

## 🔑 API Keys Setup

### Google Gemini 2.5 Flash
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

### ElevenLabs (Optional)
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Get your API key from dashboard
3. Add to `.env` as `ELEVENLABS_API_KEY`

**Note**: App works without API keys using mock responses for demo!

## 🎤 Audio Model Setup (Optional)

### Option 1: Use Mock Classification (Recommended for Demo)
- No setup needed! App automatically uses realistic mock results

### Option 2: Train Your Own Model
1. Visit [Teachable Machine](https://teachablemachine.withgoogle.com/train/audio)
2. Create 4 classes: Kick, Snare, Hi-Hat, Clap
3. Record 10+ samples of beatboxing for each
4. Export as "TensorFlow.js"
5. Place files in `models/tm-audio-model/`

## 🎯 Demo Flow

### Perfect 3-Minute Demo:

1. **Intro (30s)**: "SoundSketch.tech turns beatboxing into AI music"
2. **Beatbox (30s)**: Record live beatboxing → show AI classification
3. **Generate (30s)**: AI creates beat loop → play the result
4. **DJ Prompts (60s)**: 
   - "add more hi-hats" → Gemini modifies
   - "make it bouncy" → beat changes
   - "add 808s" → bass emphasis
5. **Narration (30s)**: ElevenLabs voice explains changes

### Quick Prompts for Demo:
- "add more hi-hats" 
- "make it bouncy"
- "add 808 bass"
- "make it lo-fi"
- "double the tempo"

## 🏆 Sponsor Prize Targeting

| Sponsor | How We Use It | Prize Value |
|---------|---------------|-------------|
| **Gemini 2.5** | DJ prompt → beat modification AI | $10,000+ |
| **ElevenLabs** | Voice narration of beat changes | $5,000+ |
| **.Tech Domain** | soundsketch.tech domain | $2,500+ |
| **DigitalOcean** | Backend hosting & APIs | $2,000+ |

## 🛠️ Development

### Project Structure
```
soundsketch-tech/
├── frontend/          # HTML/CSS/JS frontend
│   ├── js/           # Core app logic
│   └── styles.css    # UI styling
├── backend/          # Express.js API server
├── models/           # AI models directory
└── docs/            # Documentation
```

### Key Technologies
- **Frontend**: Vanilla JS + Tone.js + TensorFlow.js
- **Backend**: Node.js + Express
- **AI**: Gemini 2.5 + Teachable Machine + ElevenLabs
- **Audio**: Web Audio API + Tone.js

### Team Roles
- **Frontend Dev**: UI/UX + Audio visualization
- **AI/ML Dev**: Model training + integration  
- **Backend Dev**: API integration + hosting
- **DJ/Creative**: Prompts + live demo performance

## 🚨 Troubleshooting

### Common Issues:

**"Microphone not working"**
- Allow microphone permissions in browser
- Use HTTPS or localhost only
- Check browser console for errors

**"Backend not connecting"**
- Ensure `npm start` is running
- Check port 3000 is available
- Verify .env file exists

**"Audio not playing"**
- Click anywhere on page first (Chrome policy)
- Check browser audio permissions
- Ensure speakers/headphones connected

**"API errors"**
- App works without API keys using mocks
- Check .env file format
- Verify API key validity

### Development Mode:
```bash
# Run with auto-reload
npm run dev

# Test API endpoints
curl http://localhost:3000/health
```

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox  
- ✅ Safari (limited)
- ❌ Internet Explorer

## 🎉 Success Checklist

Before your demo, ensure:

- [ ] App loads at localhost:3000
- [ ] Microphone permission granted
- [ ] Recording shows waveform
- [ ] Beat plays after classification
- [ ] DJ prompts modify the beat
- [ ] Tempo slider works
- [ ] Quick prompts work
- [ ] Domain registered (soundsketch.tech)
- [ ] Backend deployed (DigitalOcean)

## 📞 Need Help?

Check the browser console (F12) for error messages. Most issues are related to:
1. Microphone permissions
2. Audio context (click page first)
3. Missing dependencies (run `npm install`)

**Remember**: The app is designed to work even without real API keys for demo purposes!

---

## 🎵 Ready to Rock!

Your SoundSketch.tech app is ready! Start beatboxing and let AI turn your rhythms into music! 🚀