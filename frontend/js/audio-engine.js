/**
 * Audio Engine for SoundSketch.tech
 * Handles beat generation, sequencing, and playback using Tone.js
 */

class AudioEngine {
    constructor() {
        this.isInitialized = false;
        this.isPlaying = false;
        this.currentStep = 0;
        this.bpm = 120;
        this.stepCount = 16; // 16-step sequencer
        
        // Beat pattern storage
        this.patterns = {
            kick: new Array(16).fill(false),
            snare: new Array(16).fill(false),
            hihat: new Array(16).fill(false),
            clap: new Array(16).fill(false),
            bass: new Array(16).fill(false),
            synth: new Array(16).fill(false),
            piano: new Array(16).fill(false)
        };
        
        // Tone.js components
        this.instruments = {};
        this.sequence = null;
        this.sequenceId = null; // For scheduleRepeat
        this.transport = Tone.Transport;
        
        // Callbacks
        this.onStepChange = null;
        this.onPatternUpdate = null;
    }

    /**
     * Initialize the audio engine
     */
    async init() {
        try {
            // Start audio context
            await Tone.start();
            console.log('Audio context started');

            // Create drum instruments
            this.createInstruments();
            
            // Set up sequencer
            this.setupSequencer();
            
            // Set initial tempo
            this.setTempo(this.bpm);
            
            // Set a default pattern so there's always something to play
            this.setDefaultPattern();
            
            this.isInitialized = true;
            console.log('Audio engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            throw error;
        }
    }

    /**
     * Set a default beat pattern so there's always something to play
     */
    setDefaultPattern() {
        // Basic 4-on-the-floor kick pattern
        this.updatePattern('kick', [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]);
        
        // Basic snare on 2 and 4
        this.updatePattern('snare', [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]);
        
        // Hi-hats on off-beats
        this.updatePattern('hihat', [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]);
        
        // Occasional claps
        this.updatePattern('clap', [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]);
        
        // Simple bass line
        this.updatePattern('bass', [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]);
        
        // Sparse synth melody
        this.updatePattern('synth', [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false]);
        
        // Piano accents
        this.updatePattern('piano', [false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false]);
        
        console.log('Default beat pattern set');
    }

    /**
     * Create drum sound instruments
     */
    createInstruments() {
        // Kick drum - low frequency sine wave with envelope
        this.instruments.kick = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.4,
                attackCurve: "exponential"
            }
        }).toDestination();

        // Snare drum - noise with filter
        this.instruments.snare = new Tone.NoiseSynth({
            noise: {
                type: "white"
            },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.0,
                release: 0.1
            },
            filter: {
                Q: 1,
                type: "highpass",
                rolloff: -12
            },
            filterEnvelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.0,
                release: 0.1,
                baseFrequency: 200,
                octaves: 2
            }
        }).toDestination();

        // Hi-hat - high frequency noise
        this.instruments.hihat = new Tone.NoiseSynth({
            noise: {
                type: "white"
            },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0.0,
                release: 0.05
            },
            filter: {
                Q: 1,
                type: "highpass",
                rolloff: -12
            },
            filterEnvelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0.0,
                release: 0.05,
                baseFrequency: 4000,
                octaves: 1
            }
        }).toDestination();

        // Clap - multiple short noise bursts
        this.instruments.clap = new Tone.NoiseSynth({
            noise: {
                type: "white"
            },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.0,
                release: 0.1
            },
            filter: {
                Q: 5,
                type: "bandpass",
                rolloff: -12
            },
            filterEnvelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.0,
                release: 0.1,
                baseFrequency: 1000,
                octaves: 1
            }
        }).toDestination();

        // Bass - sub-bass synth for basslines
        this.instruments.bass = new Tone.MonoSynth({
            oscillator: {
                type: "sawtooth"
            },
            filter: {
                Q: 1,
                type: "lowpass",
                rolloff: -12
            },
            filterEnvelope: {
                attack: 0.02,
                decay: 0.1,
                sustain: 0.8,
                release: 0.2,
                baseFrequency: 100,
                octaves: 3
            },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.7,
                release: 0.3
            }
        }).toDestination();

        // Synth - lead synthesizer
        this.instruments.synth = new Tone.Synth({
            oscillator: {
                type: "sawtooth"
            },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.3,
                release: 0.8
            },
            filter: {
                Q: 2,
                type: "lowpass",
                rolloff: -12
            },
            filterEnvelope: {
                attack: 0.1,
                decay: 0.3,
                sustain: 0.4,
                release: 0.8,
                baseFrequency: 300,
                octaves: 3
            }
        }).toDestination();

        // Piano - acoustic piano samples
        this.instruments.piano = new Tone.Sampler({
            urls: {
                C4: "C4.mp3",
                D4: "D4.mp3",
                E4: "E4.mp3",
                F4: "F4.mp3",
                G4: "G4.mp3",
                A4: "A4.mp3",
                B4: "B4.mp3",
                C5: "C5.mp3"
            },
            baseUrl: "https://tonejs.github.io/audio/salamander/",
            onload: () => {
                console.log('Piano samples loaded');
            }
        }).toDestination();

        console.log('All instruments created successfully');
    }

    /**
     * Set up the step sequencer
     */
    setupSequencer() {
        console.log('Setting up sequencer with scheduleRepeat...');
        
        // Clear any existing scheduled events
        if (this.sequenceId) {
            this.transport.clear(this.sequenceId);
        }
        
        // Schedule a callback every 16th note
        this.sequenceId = this.transport.scheduleRepeat((time) => {
            console.log('🎼 ScheduleRepeat callback fired for step:', this.currentStep, 'at time:', time);
            
            // Trigger instruments based on pattern
            Object.keys(this.patterns).forEach(instrument => {
                if (this.patterns[instrument][this.currentStep]) {
                    this.triggerInstrument(instrument, time);
                }
            });
            
            // Notify UI of step change
            if (this.onStepChange) {
                console.log('🔄 Calling onStepChange with step:', this.currentStep);
                this.onStepChange(this.currentStep);
            } else {
                console.log('⚠️ onStepChange callback not set, step:', this.currentStep);
            }
            
            // Move to next step
            this.currentStep = (this.currentStep + 1) % this.stepCount;
        }, "16n");
    }

    /**
     * Trigger a specific instrument
     */
    triggerInstrument(instrument, time = "+0") {
        if (!this.instruments[instrument]) return;
        
        switch (instrument) {
            case 'kick':
                this.instruments.kick.triggerAttackRelease("C2", "8n", time);
                break;
            case 'snare':
                this.instruments.snare.triggerAttackRelease("8n", time);
                break;
            case 'hihat':
                this.instruments.hihat.triggerAttackRelease("32n", time);
                break;
            case 'clap':
                this.instruments.clap.triggerAttackRelease("8n", time);
                break;
            case 'bass':
                // Bass notes in a simple pattern
                const bassNotes = ["C2", "G2", "F2", "A2"];
                const bassNote = bassNotes[this.currentStep % bassNotes.length];
                this.instruments.bass.triggerAttackRelease(bassNote, "8n", time);
                break;
            case 'synth':
                // Synth melody notes
                const synthNotes = ["C4", "E4", "G4", "B4", "D5", "F5"];
                const synthNote = synthNotes[this.currentStep % synthNotes.length];
                this.instruments.synth.triggerAttackRelease(synthNote, "8n", time);
                break;
            case 'piano':
                // Piano chord notes
                const pianoNotes = ["C4", "E4", "G4", "C5"];
                const pianoNote = pianoNotes[this.currentStep % pianoNotes.length];
                this.instruments.piano.triggerAttackRelease(pianoNote, "8n", time);
                break;
        }
    }

    /**
     * Start playing the beat
     */
    play() {
        if (!this.isInitialized) {
            console.error('Audio engine not initialized');
            return false;
        }
        
        try {
            // Ensure audio context is running
            if (Tone.context.state !== 'running') {
                console.log('Resuming audio context...');
                Tone.context.resume();
            }
            
            // Stop first to ensure clean state
            if (this.isPlaying) {
                this.stop();
            }
            
            // Ensure transport is completely stopped before restarting
            this.transport.stop();
            this.transport.cancel();
            
            // Reset transport position to beginning
            this.transport.position = 0;
            this.transport.seconds = 0;
            this.currentStep = 0;
            
            // Set up the sequencer (schedules the callback)
            this.setupSequencer();
            
            // Start transport fresh
            this.transport.start("+0"); // Start immediately
            this.isPlaying = true;
            console.log('Beat started from position 0');
            console.log('Transport state:', this.transport.state);
            console.log('Using scheduleRepeat for sequencing');
            return true;
        } catch (error) {
            console.error('Error starting beat:', error);
            return false;
        }
    }

    /**
     * Stop playing the beat
     */
    stop() {
        try {
            // Clear the scheduled sequence
            if (this.sequenceId) {
                this.transport.clear(this.sequenceId);
                this.sequenceId = null;
            }
            
            // Stop transport completely
            this.transport.stop();
            this.transport.cancel(); // Cancel any scheduled events
            this.transport.position = 0; // Reset position
            this.transport.seconds = 0; // Reset seconds
            
            this.isPlaying = false;
            this.currentStep = 0;
            console.log('Beat stopped and transport reset completely');
            return true;
        } catch (error) {
            console.error('Error stopping beat:', error);
            this.isPlaying = false;
            this.currentStep = 0;
            return false;
        }
    }

    /**
     * Set the tempo (BPM)
     */
    setTempo(bpm) {
        this.bpm = bpm;
        this.transport.bpm.value = bpm;
        console.log(`Tempo set to ${bpm} BPM`);
    }

    /**
     * Update a pattern for a specific instrument
     */
    updatePattern(instrument, pattern) {
        if (this.patterns[instrument] && Array.isArray(pattern)) {
            this.patterns[instrument] = [...pattern];
            console.log(`Pattern updated for ${instrument}:`, pattern);
            
            if (this.onPatternUpdate) {
                this.onPatternUpdate(instrument, pattern);
            }
        }
    }

    /**
     * Generate a basic pattern from AI classification
     */
    generatePatternFromClassification(classification) {
        const patterns = {
            kick: new Array(16).fill(false),
            snare: new Array(16).fill(false),
            hihat: new Array(16).fill(false),
            clap: new Array(16).fill(false),
            bass: new Array(16).fill(false),
            synth: new Array(16).fill(false),
            piano: new Array(16).fill(false)
        };

        // Generate kick pattern based on classification confidence
        if (classification.kick > 0.3) {
            patterns.kick[0] = true;
            patterns.kick[4] = true;
            patterns.kick[8] = true;
            patterns.kick[12] = true;
            
            // Add extra kicks if confidence is high
            if (classification.kick > 0.7) {
                patterns.kick[6] = true;
                patterns.kick[14] = true;
            }
        }

        // Generate snare pattern
        if (classification.snare > 0.3) {
            patterns.snare[4] = true;
            patterns.snare[12] = true;
            
            if (classification.snare > 0.6) {
                patterns.snare[10] = true;
            }
        }

        // Generate hi-hat pattern
        if (classification.hihat > 0.2) {
            for (let i = 2; i < 16; i += 4) {
                patterns.hihat[i] = true;
            }
            
            if (classification.hihat > 0.5) {
                for (let i = 1; i < 16; i += 2) {
                    patterns.hihat[i] = Math.random() > 0.6;
                }
            }
        }

        // Generate clap pattern
        if (classification.clap > 0.4) {
            patterns.clap[4] = true;
            patterns.clap[12] = true;
            
            if (classification.clap > 0.7) {
                patterns.clap[6] = true;
                patterns.clap[14] = true;
            }
        }

        // Generate bass pattern (complements kick)
        if (classification.kick > 0.2) {
            // Bass on downbeats, but less frequently than kick
            patterns.bass[0] = Math.random() > 0.3;
            patterns.bass[4] = Math.random() > 0.5;
            patterns.bass[8] = Math.random() > 0.3;
            patterns.bass[12] = Math.random() > 0.5;
        }

        // Generate synth pattern (melodic elements)
        if (classification.hihat > 0.3 || classification.snare > 0.3) {
            // Add some melodic interest
            for (let i = 0; i < 16; i += 4) {
                if (Math.random() > 0.7) {
                    patterns.synth[i] = true;
                }
            }
        }

        // Generate piano pattern (harmonic elements)
        if (classification.clap > 0.5) {
            // Piano on some off-beats for harmony
            patterns.piano[2] = Math.random() > 0.6;
            patterns.piano[6] = Math.random() > 0.6;
            patterns.piano[10] = Math.random() > 0.6;
            patterns.piano[14] = Math.random() > 0.6;
        }

        // Update all patterns
        Object.keys(patterns).forEach(instrument => {
            this.updatePattern(instrument, patterns[instrument]);
        });

        console.log('Generated patterns from classification:', patterns);
        return patterns;
    }

    /**
     * Apply DJ modifications to the current pattern
     */
    applyDJModifications(modifications) {
        try {
            console.log('Applying DJ modifications:', modifications);
            
            // Parse and apply modifications
            Object.keys(modifications).forEach(instrument => {
                if (modifications[instrument] && Array.isArray(modifications[instrument])) {
                    this.updatePattern(instrument, modifications[instrument]);
                }
            });
            
            // Apply tempo changes if specified
            if (modifications.tempo) {
                this.setTempo(modifications.tempo);
            }
            
            return true;
        } catch (error) {
            console.error('Error applying DJ modifications:', error);
            return false;
        }
    }

    /**
     * Get current patterns
     */
    getPatterns() {
        return { ...this.patterns };
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isPlaying: this.isPlaying,
            currentStep: this.currentStep,
            bpm: this.bpm,
            patterns: this.getPatterns()
        };
    }

    /**
     * Preview a single instrument sound
     */
    previewInstrument(instrument) {
        this.triggerInstrument(instrument);
    }

    /**
     * Set step change callback
     */
    onStepChanged(callback) {
        this.onStepChange = callback;
    }

    /**
     * Set pattern update callback
     */
    onPatternUpdated(callback) {
        this.onPatternUpdate = callback;
    }
}

// Export for use in other modules
window.AudioEngine = AudioEngine;