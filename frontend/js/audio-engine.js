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
            clap: new Array(16).fill(false)
        };
        
        // Tone.js components
        this.instruments = {};
        this.sequence = null;
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
            
            this.isInitialized = true;
            console.log('Audio engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            throw error;
        }
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

        console.log('Instruments created successfully');
    }

    /**
     * Set up the step sequencer
     */
    setupSequencer() {
        this.sequence = new Tone.Sequence((time, step) => {
            this.currentStep = step;
            
            // Trigger instruments based on pattern
            Object.keys(this.patterns).forEach(instrument => {
                if (this.patterns[instrument][step]) {
                    this.triggerInstrument(instrument, time);
                }
            });
            
            // Notify UI of step change
            if (this.onStepChange) {
                this.onStepChange(step);
            }
            
        }, Array.from({length: this.stepCount}, (_, i) => i), "16n");
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
            // Stop first to ensure clean state
            if (this.isPlaying) {
                this.stop();
            }
            
            // Restart the sequence from the beginning
            this.sequence.start(0);
            this.transport.start();
            this.isPlaying = true;
            console.log('Beat started');
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
            if (this.sequence) {
                this.sequence.stop();
            }
            if (this.transport) {
                this.transport.stop();
                this.transport.cancel(); // Cancel any scheduled events
            }
            this.isPlaying = false;
            this.currentStep = 0;
            console.log('Beat stopped');
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
            clap: new Array(16).fill(false)
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