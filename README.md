# 🎵 StarTracks

**Transform your beatbox into AI-powered music!**

[![Demo](https://img.shields.io/badge/Live%20Demo-startracks-blue)](http://startracks)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Built%20for-Hackathon-orange.svg)](.)

## 🎯 What is StarTracks?

A revolutionary web app that combines **human creativity** with **AI intelligence**:

1. 🎤 **Beatbox into your microphone** - Express your rhythm naturally
2. 🧠 **AI analyzes your beats** - TensorFlow.js identifies kick, snare, hi-hat, clap
3. 🎵 **Generates a looped beat** - Tone.js creates professional-quality audio
4. 🎧 **DJ AI modifies on command** - Gemini 2.5 interprets your text prompts
5. 🎤 **Producer Tag** - Add your signature tag spoken in a female voice at the start of each loop

**From "boom-tss-boom-boom-tss" to professional beats in 30 seconds!**

## 🚀 Live Demo

**Try it now**: [startracks](http://startracks)

Or run locally:
```bash
git clone https://github.com/tominister/mucis.git
cd mucis
npm install
npm start
# Visit http://localhost:3000
```

## 🎬 How It Works

```
[Beatbox] → [AI Analysis] → [Beat Generation] → [DJ Prompts] → [Modified Music]
    ↓            ↓               ↓                ↓              ↓
  Your voice  TensorFlow.js    Tone.js      Gemini 2.5    ElevenLabs
```

### Example Workflow:
1. **Record**: Beatbox "boom-tss-boom-boom-tss" for 3 seconds
2. **Analyze**: AI detects 80% kick, 70% snare, 60% hi-hat confidence
3. **Generate**: Creates 16-step drum pattern with proper timing
4. **Modify**: Type "add more hi-hats" → Gemini updates the pattern
5. **Narrate**: AI voice says "Added hi-hats on off-beats for busier rhythm"

## 🛠️ Tech Stack

### Frontend
- **Vanilla JavaScript** - No framework overhead, maximum performance
- **Tone.js** - Professional audio synthesis and sequencing
- **TensorFlow.js** - Client-side audio classification
- **Web Audio API** - Real-time microphone input and visualization

### AI & APIs
- **Google Gemini 2.5 Flash** - Natural language → beat modifications
- **ElevenLabs** - High-quality voice synthesis
- **Teachable Machine** - Custom audio classification models

### Backend
- **Node.js + Express** - Lightweight API server
- **DigitalOcean** - Cloud hosting and deployment

### Domain
- **Brand** - Professional branding as StarTracks

## 🏆 Hackathon Sponsor Prizes

This project specifically targets multiple sponsor categories:

| Sponsor | Integration | Prize Potential |
|---------|-------------|----------------|
| **🧠 Gemini 2.5** | Core DJ AI prompt processing | $10,000+ |
| **🎙️ ElevenLabs** | Voice narration of beat changes | $5,000+ |
| **🌐 .Tech Domain** | Professional domain branding | $2,500+ |
| **☁️ DigitalOcean** | Backend hosting & API delivery | $2,000+ |

## 📁 Project Structure

```
startracks/
├── 📁 frontend/           # Web interface
│   ├── 📄 index.html     # Main UI
│   ├── 🎨 styles.css     # Styling
│   └── 📁 js/            # Application logic
│       ├── 🎵 audio-engine.js    # Tone.js integration
│       ├── 🧠 ai-classifier.js   # TensorFlow.js models
│       ├── 🔌 api-client.js      # Backend communication
│       └── 📱 app.js             # Main coordinator
├── 📁 backend/           # Express.js server
│   └── 🖥️ server.js      # API endpoints
├── 📁 models/            # AI models directory
│   └── 📄 README.md      # Model setup instructions
├── 📁 docs/              # Documentation
│   ├── 📋 SETUP.md       # Setup guide
│   └── 🎤 DEMO_SCRIPT.md # Demo presentation
└── 📦 package.json       # Dependencies
```

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/tominister/mucis.git
cd mucis
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your API keys (optional - works without them!)
```

### 3. Run
```bash
npm start
# Visit http://localhost:3000
```

**That's it!** The app works out of the box with mock AI responses for demo purposes.

## 🎯 Demo Guide

### Perfect 3-Minute Demo Flow:

1. **Intro (30s)**: "StarTracks turns beatboxing into AI music"
2. **Beatbox (30s)**: Live recording → show AI classification results
3. **Generate (30s)**: AI creates beat → play the loop
4. **DJ Prompts (90s)**: 
   - "add more hi-hats" → Gemini modifies beat
   - "make it bouncy" → rhythm changes
   - "add 808s" → bass enhancement
5. **Narration (30s)**: ElevenLabs voice explains changes

**See full demo script**: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

## 🔧 Configuration

### API Keys (Optional)
```env
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Audio Model Setup
1. Train at [Teachable Machine](https://teachablemachine.withgoogle.com/train/audio)
2. Create classes: Kick, Snare, Hi-Hat, Clap
3. Export as TensorFlow.js
4. Place in `models/tm-audio-model/`

**Or skip this** - app uses realistic mock classification for demos!

## 🎵 Musical Features

### Beat Generation
- **16-step sequencer** with professional timing
- **4 drum instruments**: Kick, Snare, Hi-Hat, Clap
- **Real-time visualization** of playing patterns
- **Tempo control** (80-180 BPM)

### AI DJ Capabilities
- **Natural language prompts**: "make it funky", "add 808s"
- **Pattern modification**: Adds/removes beats intelligently
- **Style understanding**: Lo-fi, bouncy, trap, etc.
- **Musical logic**: Maintains proper rhythm structure

### Example DJ Prompts:
- "add more hi-hats" → Fills in off-beats
- "make it bouncy" → Adds syncopated kicks
- "add 808 bass" → Creates modern trap pattern
- "make it lo-fi" → Simplifies and adds space
- "double the tempo" → Increases BPM

## 🌟 Unique Value Proposition

### For Hackathons:
- **Multi-sponsor alignment** - Targets 4+ prize categories
- **Live demo ready** - Works reliably in presentation settings
- **Technical innovation** - Combines multiple cutting-edge APIs
- **Practical application** - Solves real creative workflow problems

### For Music:
- **Democratizes beat creation** - No music theory required
- **Bridges human/AI creativity** - Enhances rather than replaces
- **Real-time collaboration** - Natural language music direction
- **Educational potential** - Learn rhythm through experimentation

## 🚀 Future Roadmap

### Phase 2: Enhanced Features
- **Multi-track sequencing** - Bass, melody, effects
- **Real-time collaboration** - Multiple users, one beat
- **Export capabilities** - Download as WAV/MIDI
- **Mobile app** - Native iOS/Android versions

### Phase 3: Platform Integration
- **Streaming platforms** - Direct upload to Spotify/SoundCloud
- **Social features** - Share and remix community beats
- **DAW plugins** - Integrate with Pro Tools, Ableton
- **Hardware support** - MIDI controllers, drum pads

## 🤝 Contributing

We welcome contributions! This project is perfect for:
- **Audio engineers** - Improve sound synthesis
- **ML engineers** - Enhance classification models  
- **Frontend developers** - Polish UI/UX
- **Musicians** - Add musical intelligence

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - feel free to use this project for your own hackathons!

## 🙏 Acknowledgments

- **Google** - Gemini 2.5 API and Teachable Machine
- **ElevenLabs** - Voice synthesis technology
- **Tone.js** - Incredible web audio framework
- **TensorFlow.js** - Client-side machine learning
- **Hackathon organizers** - For inspiring innovation

---

## 🎵 Ready to Transform Sound?

**[Try StarTracks now →](http://startracks)**

*Turn your voice into music. Turn your ideas into beats. Turn your creativity into AI-powered innovation.*

---

**Built with ❤️ for hackathons | Made to win sponsor prizes | Designed to inspire**
