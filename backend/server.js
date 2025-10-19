/**
 * Backend Server 
 * Handles API requests for Gemini and ElevenLabs integration
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080'
}));
app.use(express.json());
app.use(express.static('frontend'));
// Serve drumset samples
app.use('/drumset', express.static('drumset'));
// Serve models directory so frontend can load Teachable Machine exports placed at /models
app.use('/models', express.static(path.join(__dirname, '../models')));

/**
 * Fallback:
 * This is a safe convenience only for local development.
 */
app.get('/models/tm-my-audio-model/model.json', (req, res, next) => {
    try {
        // Prefer the exact path first
        const preferredDir = path.join(__dirname, '..', 'models', 'tm-my-audio-model');
        const preferredPath = path.join(preferredDir, 'model.json');
        if (fs.existsSync(preferredPath)) return res.sendFile(preferredPath);

        // If not present, search for any sibling directory that starts with tm-my-audio-model
        const modelsRoot = path.join(__dirname, '..', 'models');
        const entries = fs.readdirSync(modelsRoot, { withFileTypes: true });
        for (const ent of entries) {
            if (!ent.isDirectory()) continue;
            if (ent.name.toLowerCase().startsWith('tm-my-audio-model')) {
                const candidatePath = path.join(modelsRoot, ent.name, 'model.json');
                if (fs.existsSync(candidatePath)) {
                    console.log(`Serving model.json from folder: ${ent.name}`);
                    return res.sendFile(candidatePath);
                }
            }
        }

        return res.status(404).json({ success: false, error: 'model.json not found in tm-my-audio-model* directories' });
    } catch (err) {
        console.error('Model fallback error:', err);
        return res.status(500).json({ success: false, error: String(err.message) });
    }
});

// Simple request logging for debugging (method, path, body)
app.use((req, res, next) => {
    try {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Request body:', req.body);
        }
    } catch (e) {
        console.warn('Request logging failed', e);
    }
    next();
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper: safe write file to models directory
const fs = require('fs');
const MODEL_DIR = path.join(__dirname, '../models/tm-my-audio-model');

// Ensure models directory exists
try {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
} catch (e) {
    console.warn('Could not create model directory:', e.message);
}


// API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

/**
 * Keys check endpoint - safe diagnostic
 * Returns whether GEMINI and ELEVENLABS env vars are present.
 * If present, performs a lightweight, timed test call to each provider and
 * returns a sanitized success/failure result (no secret data returned).
 */
app.get('/api/keys/check', async (req, res) => {
    const result = {
        hasGeminiKey: !!GEMINI_API_KEY,
        hasElevenlabsKey: !!ELEVENLABS_API_KEY,
        gemini: null,
        elevenlabs: null
    };

    // Use a short timeout for test calls
    const axiosConfig = { timeout: 5000 };

    // Test Gemini (non-destructive generateContent call with tiny prompt)
    if (GEMINI_API_KEY) {
        try {
            const testPrompt = 'Return a single-word JSON: {"ok":1}';
            const geminiResp = await axios.post(
                `${GEMINI_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: testPrompt }] }],
                    generationConfig: { maxOutputTokens: 10 }
                },
                axiosConfig
            );
            if (geminiResp && geminiResp.status >= 200 && geminiResp.status < 300) {
                result.gemini = { ok: true, status: geminiResp.status };
            } else {
                result.gemini = { ok: false, status: geminiResp.status };
            }
        } catch (err) {
            result.gemini = { ok: false, error: String(err.message) };
        }
    }

    // Test ElevenLabs (GET voices) - lightweight
    if (ELEVENLABS_API_KEY) {
        try {
            const elResp = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
                headers: { 'xi-api-key': ELEVENLABS_API_KEY },
                timeout: 5000
            });
            if (elResp && elResp.status >= 200 && elResp.status < 300) {
                result.elevenlabs = { ok: true, status: elResp.status };
            } else {
                result.elevenlabs = { ok: false, status: elResp.status };
            }
        } catch (err) {
            result.elevenlabs = { ok: false, error: String(err.message) };
        }
    }

    res.json({ success: true, result });
});

/**
 * Serve the frontend
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/**
 * Gemini API: Process DJ prompt and modify beat patterns
 */
app.post('/api/gemini/process-prompt', async (req, res) => {
    try {
        const { prompt, currentPatterns } = req.body;
        
        if (!prompt || !currentPatterns) {
            return res.status(400).json({
                success: false,
                error: 'Missing prompt or currentPatterns'
            });
        }

        console.log('Processing prompt with Gemini:', prompt);

        // Construct the prompt for Gemini
                const geminiPrompt = `

You are a DJ and music producer assistant. The user will provide a 16-step beat matrix for six percussion rows. Each row is an array of 16 values where 1 means "play" and 0 means "silent" (booleans are also acceptable: true/false).

Current patterns (use these as the source of truth):
- Kick: ${JSON.stringify(currentPatterns.kick)}
- Snare: ${JSON.stringify(currentPatterns.snare)}
- Hi-hat: ${JSON.stringify(currentPatterns.hihat)}
- Clap: ${JSON.stringify(currentPatterns.clap)}
- Cymbal: ${JSON.stringify(currentPatterns.cymbal || new Array(16).fill(false))}
- Perc: ${JSON.stringify(currentPatterns.perc || new Array(16).fill(false))}

User instruction: "${prompt}"


TASK: Modify the provided 16-step matrices according to the user instruction and return ONLY a single JSON object (no extra commentary, no markdown). The JSON must include the keys "kick", "snare", "hihat", "clap", "cymbal", and "perc" whose values are arrays of length 16 containing only 0 or 1 (numeric) or true/false (boolean). Optionally include a numeric "tempo" if the prompt requests a BPM change. Also include an "explanation" string describing the musical change in 1-2 sentences.

STRICT RESPONSE REQUIREMENTS:
1) Return exactly one JSON object and nothing else.
2) Arrays must be length 16. Use 0/1 (preferred) or true/false.
3) Do not include any additional keys beyond the four patterns, optional tempo, and explanation.

Example response:
{
    "kick": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    "snare": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    "hihat": [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
    "clap": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    "cymbal": [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    "perc": [0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0],
    "tempo": 128,
    "explanation": "Added extra off-beat hi-hats, a cymbal hit on beat 9, and added percussion for groove; raised tempo for more energy."
}

Keep the changes musically sensible and minimal unless the user asks for an extreme transformation.
`;

        let geminiResponse;
        
        if (GEMINI_API_KEY) {
            // Make actual Gemini API call
            const response = await axios.post(
                `${GEMINI_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{
                            text: geminiPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const generatedText = response.data.candidates[0].content.parts[0].text;
            
            // Extract JSON from the response
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                geminiResponse = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in Gemini response');
            }
            
        } else {
            // Use mock response
            console.log('Using mock Gemini response');
            geminiResponse = generateMockGeminiResponse(prompt, currentPatterns);
        }

        // Validate the response
        const validatedResponse = validateBeatModification(geminiResponse, currentPatterns);

        res.json({
            success: true,
            modifications: validatedResponse,
            explanation: validatedResponse.explanation
        });

    } catch (error) {
        console.error('Gemini API error:', error && error.message ? error.message : error);

        // If Gemini API key is not configured, fallback to mock (local dev convenience)
        if (!GEMINI_API_KEY) {
            console.log('GEMINI_API_KEY not present - returning mock Gemini response');
            const mockResponse = generateMockGeminiResponse(req.body.prompt, req.body.currentPatterns);
            return res.json({
                success: true,
                modifications: mockResponse,
                explanation: mockResponse.explanation
            });
        }

        // Otherwise, surface an error to the client with a sanitized message
        return res.status(500).json({
            success: false,
            error: 'Failed to process prompt with Gemini',
            details: String(error && error.message ? error.message : error)
        });
    }
});

/**
 * ElevenLabs API: Generate voice narration
 */
app.post('/api/elevenlabs/narrate', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Missing text'
            });
        }

        console.log('Generating narration with ElevenLabs:', text.substring(0, 50) + '...');

        if (ELEVENLABS_API_KEY) {
            // Make actual ElevenLabs API call
            const response = await axios.post(
                `${ELEVENLABS_BASE_URL}/text-to-speech/21m00Tcm4TlvDq8ikWAM`, // Default voice ID
                {
                    text: text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY
                    },
                    responseType: 'arraybuffer'
                }
            );

            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': response.data.length
            });
            
            res.send(Buffer.from(response.data));
            
        } else {
            // Mock response - return empty audio or error
            console.log('ElevenLabs API key not provided, using mock response');
            res.status(503).json({
                success: false,
                error: 'ElevenLabs API not configured'
            });
        }

    } catch (error) {
        console.error('ElevenLabs API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate narration'
        });
    }
});

/**
 * ElevenLabs API: Generate producer tag (female voice)
 */
app.post('/api/elevenlabs/producer-tag', async (req, res) => {
    try {
        const { tag, voice } = req.body;

        if (!tag) {
            return res.status(400).json({
                success: false,
                error: 'Missing tag text'
            });
        }

        console.log('Generating producer tag with ElevenLabs:', tag);

        if (ELEVENLABS_API_KEY) {
            // Use a female voice for producer tags - Bella voice ID
            const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Bella - female voice

            const response = await axios.post(
                `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
                {
                    text: tag,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.8, // Higher similarity for clearer producer tags
                        style: 0.5,
                        use_speaker_boost: true
                    }
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY
                    },
                    responseType: 'arraybuffer'
                }
            );

            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': response.data.length
            });

            res.send(Buffer.from(response.data));

        } else {
            // Mock response - return empty audio or error
            console.log('ElevenLabs API key not provided, using mock response');
            res.status(503).json({
                success: false,
                error: 'ElevenLabs API not configured'
            });
        }

    } catch (error) {
        console.error('ElevenLabs API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate producer tag'
        });
    }
});


/**
 * Upload Teachable Machine model files.
 * Accepts either a single ZIP file (containing model.json, metadata.json, weights.bin)
 * or multiple files uploaded with field name 'files'.
 * Writes files to ./models/tm-my-audio-model safely.
 */
app.post('/api/upload-model', upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        // If a single zip is provided, try to extract it in-memory
        const zipFile = req.files.find(f => f.mimetype === 'application/zip' || f.originalname.endsWith('.zip'));
        if (zipFile) {
            // Lazy require to avoid adding dependency unless used
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(zipFile.buffer);
            const entries = zip.getEntries();

            // Validate entries and write only expected filenames
            const allowed = new Set(['model.json', 'metadata.json', 'weights.bin']);
            entries.forEach(entry => {
                const name = path.basename(entry.entryName);
                if (!allowed.has(name)) return;
                const destPath = path.join(MODEL_DIR, name);
                // Prevent path traversal
                if (!destPath.startsWith(MODEL_DIR)) return;
                fs.writeFileSync(destPath, entry.getData());
                console.log('Wrote model file from zip:', name);
            });

            return res.json({ success: true, message: 'Model uploaded (zip)' });
        }

        // Otherwise accept individual files
        for (const file of req.files) {
            const name = path.basename(file.originalname);
            if (!['model.json', 'metadata.json', 'weights.bin'].includes(name)) continue;
            const destPath = path.join(MODEL_DIR, name);
            if (!destPath.startsWith(MODEL_DIR)) continue; // safety
            fs.writeFileSync(destPath, file.buffer);
            console.log('Wrote model file:', name);
        }

        return res.json({ success: true, message: 'Model uploaded' });
    } catch (err) {
        console.error('Model upload error:', err);
        return res.status(500).json({ success: false, error: String(err.message) });
    }
});

/**
 * Generate mock Gemini response for testing
 */
function generateMockGeminiResponse(prompt, currentPatterns) {
    const modifications = {
        kick: [...currentPatterns.kick],
        snare: [...currentPatterns.snare],
        hihat: [...currentPatterns.hihat],
        clap: [...currentPatterns.clap],
        cymbal: (currentPatterns.cymbal || new Array(16).fill(false)),
        perc: (currentPatterns.perc || new Array(16).fill(false)),
        explanation: 'Applied modifications based on your request.'
    };

    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('hi-hat') || promptLower.includes('hihat')) {
        // Add more hi-hats
        modifications.hihat = modifications.hihat.map((step, i) => 
            step || (i % 2 === 1 && Math.random() > 0.3)
        );
        modifications.explanation = "Added more hi-hat patterns on the off-beats for a busier rhythm.";
        
    } else if (promptLower.includes('bouncy') || promptLower.includes('swing')) {
        // Make it bouncy by shifting some beats
        modifications.kick[6] = true;
        modifications.kick[14] = true;
        modifications.explanation = "Added syncopated kick patterns to make the beat more bouncy.";
        
    } else if (promptLower.includes('808') || promptLower.includes('bass')) {
        // Emphasize kick pattern
        modifications.kick = [true, false, false, false, true, false, true, false, 
                             true, false, false, false, true, false, true, false];
        modifications.explanation = "Created an 808-style kick pattern with emphasis on the low end.";
        
    } else if (promptLower.includes('lo-fi') || promptLower.includes('lofi')) {
        // Reduce complexity
        modifications.hihat = modifications.hihat.map((step, i) => 
            i % 4 === 2 || i % 4 === 0
        );
        modifications.snare = [false, false, false, false, true, false, false, false,
                              false, false, false, false, true, false, false, false];
        modifications.explanation = "Simplified the pattern with lo-fi style spacing.";
        
    } else if (promptLower.includes('double') && promptLower.includes('tempo')) {
        // Double the tempo
        modifications.tempo = Math.min(180, (currentPatterns.tempo || 120) * 1.5);
        modifications.explanation = `Increased the tempo to ${Math.round(modifications.tempo)} BPM for higher energy.`;
        
    } else if (promptLower.includes('funk') || promptLower.includes('funky')) {
        // Add funky patterns
        modifications.snare = [false, false, false, true, false, true, false, false,
                              false, false, true, false, false, true, false, false];
        modifications.clap = [false, false, false, false, true, false, false, true,
                             false, false, false, false, true, false, false, false];
        // Add a cymbal on the off-beat and light percussion
        modifications.cymbal = [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
        modifications.perc = modifications.perc.map((step, i) => ((i % 3 === 1) ? true : step));
        modifications.explanation = "Added syncopated snare and clap patterns for a funky groove.";
        
    } else {
        // Generic modification
        modifications.hihat = modifications.hihat.map((step, i) => 
            step || Math.random() > 0.7
        );
        // Occasionally add a cymbal or percussion to keep it interesting
        if (Math.random() > 0.6) {
            modifications.cymbal[Math.floor(Math.random() * 16)] = true;
        }
        if (Math.random() > 0.5) {
            modifications.perc[Math.floor(Math.random() * 16)] = true;
        }
        modifications.explanation = "Applied general modifications to enhance the rhythm.";
    }

    return modifications;
}

/**
 * Map syllables to 16-step drum pattern
 */
function mapSyllablesToPattern(rhythmData) {
    const pattern = {
        bpm: rhythmData.bpm || 120,
        kick: new Array(16).fill(false),
        snare: new Array(16).fill(false),
        hihat: new Array(16).fill(false),
        clap: new Array(16).fill(false),
        cymbal: new Array(16).fill(false),
        perc: new Array(16).fill(false)
    };

    // Calculate step duration based on BPM
    const beatsPerSecond = pattern.bpm / 60;
    const secondsPerBeat = 1 / beatsPerSecond;
    const secondsPer16Steps = secondsPerBeat * 4; // 4 beats = 1 measure
    const secondsPerStep = secondsPer16Steps / 16;

    // Map each syllable to the nearest step
    rhythmData.syllables.forEach(syllable => {
        const stepIndex = Math.round(syllable.time / secondsPerStep) % 16;
        
        // Map phoneme to drum type
        switch(syllable.type) {
            case 'kick':
                pattern.kick[stepIndex] = true;
                break;
            case 'snare':
                pattern.snare[stepIndex] = true;
                break;
            case 'hihat':
                pattern.hihat[stepIndex] = true;
                break;
            case 'clap':
                pattern.clap[stepIndex] = true;
                break;
            case 'cymbal':
                pattern.cymbal[stepIndex] = true;
                break;
            case 'perc':
                pattern.perc[stepIndex] = true;
                break;
        }
    });

    return pattern;
}

/**
 * Enhance pattern with Gemini AI
 */
async function enhancePatternWithGemini(pattern, style, bpm) {
    const geminiPrompt = `
You are a professional music producer. I have a basic drum pattern that was created from beatboxing:

Current 16-step pattern:
- Kick: ${JSON.stringify(pattern.kick)}
- Snare: ${JSON.stringify(pattern.snare)}
- Hi-hat: ${JSON.stringify(pattern.hihat)}
- Clap: ${JSON.stringify(pattern.clap)}
- Cymbal: ${JSON.stringify(pattern.cymbal)}
- Perc: ${JSON.stringify(pattern.perc)}
- BPM: ${bpm}

Please enhance this pattern to make it sound like: "${style}"

Respond with a JSON object containing enhanced patterns for all 6 instruments (16 booleans each), the BPM, and an explanation.

Response format:
{
  "kick": [true, false, ...],
  "snare": [false, false, ...],
  "hihat": [false, true, ...],
  "clap": [false, false, ...],
  "cymbal": [false, false, ...],
  "perc": [false, false, ...],
  "bpm": 125,
  "explanation": "Enhanced the pattern by..."
}
`;

    const response = await axios.post(
        `${GEMINI_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            contents: [{
                parts: [{
                    text: geminiPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        },
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const enhanced = JSON.parse(jsonMatch[0]);
        return {
            ...pattern,
            ...enhanced
        };
    }

    return pattern;
}

/**
 * Validate and sanitize beat modification response
 */
function validateBeatModification(response, currentPatterns) {
    const validated = {
        kick: currentPatterns.kick,
        snare: currentPatterns.snare,
        hihat: currentPatterns.hihat,
        clap: currentPatterns.clap,
        cymbal: currentPatterns.cymbal || new Array(16).fill(false),
        perc: currentPatterns.perc || new Array(16).fill(false),
        explanation: response.explanation || 'Beat pattern updated.'
    };

    // Validate each pattern
    ['kick', 'snare', 'hihat', 'clap', 'cymbal', 'perc'].forEach(instrument => {
        if (Array.isArray(response[instrument]) && response[instrument].length === 16) {
            // Coerce values: accept 0/1 numbers or booleans; treat any truthy value as true
            validated[instrument] = response[instrument].map(step => {
                if (typeof step === 'number') return step === 1;
                return !!step;
            });
        }
    });

    // Validate tempo
    if (response.tempo && typeof response.tempo === 'number' && 
        response.tempo >= 60 && response.tempo <= 200) {
        validated.tempo = response.tempo;
    }

    return validated;
}

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
    console.log(`🎵 StarTracks backend running on port ${PORT}`);
    console.log(`🔗 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔑 Gemini API: ${GEMINI_API_KEY ? 'Configured' : 'Not configured (using mock)'}`);
    console.log(`🔑 ElevenLabs API: ${ELEVENLABS_API_KEY ? 'Configured' : 'Not configured (using mock)'}`);
});

module.exports = app;