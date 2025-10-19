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
            cymbal: new Array(16).fill(false),
            perc: new Array(16).fill(false)
        };
        
        // Tone.js components
        this.instruments = {};
        this.sequence = null;
        this.sequenceId = null; // For scheduleRepeat
        this.transport = Tone.Transport;
        this.producerTagAudio = null;
        this.producerTagPlayer = null;
    this.producerTagSpeech = null; // text to speak as fallback
        
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

            // Create drum instruments (now async)
            await this.createInstruments();
            
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
        
        // Cymbal accents
        this.updatePattern('cymbal', [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]);
        
        // Percussion texture
        this.updatePattern('perc', [false, true, false, false, false, true, false, false, false, true, false, false, false, true, false, false]);
        
        console.log('Default beat pattern set');
    }

    /**
     * Create drum sound instruments
     */
    async createInstruments() {
        // Kick drum - using actual sample
        this.instruments.kick = new Tone.Player({
            url: "../drumset/kick/ZEN_ALL_kick_one_shot_smooth.wav",
            onload: () => {
                console.log('✅ Kick sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load kick sample:', error);
            }
        }).toDestination();

        // Snare drum - using actual sample
        this.instruments.snare = new Tone.Player({
            url: "../drumset/snare/reddot_snare.wav.wav",
            onload: () => {
                console.log('✅ Snare sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load snare sample:', error);
            }
        }).toDestination();

        // Hi-hat - using actual sample
        this.instruments.hihat = new Tone.Player({
            url: "../drumset/hat/hat_invention.wav.wav",
            onload: () => {
                console.log('✅ Hi-hat sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load hi-hat sample:', error);
            }
        }).toDestination();

        // Clap - using actual sample
        this.instruments.clap = new Tone.Player({
            url: "../drumset/clap/DS_VTH2_drum_clap_one_shot_edge.wav",
            onload: () => {
                console.log('✅ Clap sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load clap sample:', error);
            }
        }).toDestination();

        // Cymbal - using actual sample
        this.instruments.cymbal = new Tone.Player({
            url: "../drumset/cymbal/cym1.wav",
            onload: () => {
                console.log('✅ Cymbal sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load cymbal sample:', error);
            }
        }).toDestination();

        // Perc - using actual sample
        this.instruments.perc = new Tone.Player({
            url: "../drumset/perc/perc1.wav",
            onload: () => {
                console.log('✅ Perc sample loaded');
            },
            onerror: (error) => {
                console.error('❌ Failed to load perc sample:', error);
            }
        }).toDestination();

        // Wait for all samples to load
        try {
            await Tone.loaded();
            console.log('✅ All drum samples loaded successfully');
        } catch (error) {
            console.error('❌ Error loading drum samples:', error);
        }

        console.log('All drum instruments created successfully');
    }

    /**
     * Set up the step sequencer
     */
    setupSequencer() {
        console.log('Setting up sequencer with scheduleRepeat...');
        
        // Clear any existing scheduled events (handle ID === 0 correctly)
        if (this.sequenceId != null) {
            try {
                this.transport.clear(this.sequenceId);
            } catch (e) {
                console.warn('Failed to clear previous sequenceId', this.sequenceId, e);
            }
            this.sequenceId = null;
        }
        
        // Schedule a callback every 16th note
        this.sequenceId = this.transport.scheduleRepeat((time) => {
            console.log('🎼 ScheduleRepeat callback fired for step:', this.currentStep, 'at time:', time);
            
            // Play producer tag at the start of each loop
            if (this.currentStep === 0 && this.producerTagPlayer) {
                try {
                    this.producerTagPlayer.start(time);
                    console.log('🎤 Playing producer tag at loop start');
                } catch (error) {
                    console.error('Error playing producer tag:', error);
                }
            } else if (this.currentStep === 0 && this.producerTagSpeech) {
                // If there's no audio player, use SpeechSynthesis as a fallback
                try {
                    // Use setTimeout to align speech with the scheduled time roughly
                    setTimeout(() => {
                        try {
                            const utter = new SpeechSynthesisUtterance(this.producerTagSpeech);
                            // Attempt to prefer a female voice if available
                            const voices = speechSynthesis.getVoices() || [];
                            const femaleVoice = voices.find(v => /female|woman|woman voice|girl/i.test(v.name) || /female|woman|girl/i.test(v.gender || ''));
                            if (femaleVoice) utter.voice = femaleVoice;
                            utter.rate = 1.0;
                            utter.pitch = 1.1;
                            speechSynthesis.speak(utter);
                            console.log('🎤 Spoken producer tag (TTS):', this.producerTagSpeech);
                        } catch (e) {
                            console.warn('SpeechSynthesis fallback failed:', e);
                        }
                    }, 0);
                } catch (error) {
                    console.error('Error speaking producer tag:', error);
                }
            }
            
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
                if (this.instruments.kick.loaded) {
                    // Stop if playing, then start from beginning
                    if (this.instruments.kick.state === 'started') {
                        this.instruments.kick.stop();
                    }
                    this.instruments.kick.start(time);
                }
                break;
            case 'snare':
                if (this.instruments.snare.loaded) {
                    if (this.instruments.snare.state === 'started') {
                        this.instruments.snare.stop();
                    }
                    this.instruments.snare.start(time);
                }
                break;
            case 'hihat':
                if (this.instruments.hihat.loaded) {
                    if (this.instruments.hihat.state === 'started') {
                        this.instruments.hihat.stop();
                    }
                    this.instruments.hihat.start(time);
                }
                break;
            case 'clap':
                if (this.instruments.clap.loaded) {
                    if (this.instruments.clap.state === 'started') {
                        this.instruments.clap.stop();
                    }
                    this.instruments.clap.start(time);
                }
                break;
            case 'cymbal':
                if (this.instruments.cymbal.loaded) {
                    if (this.instruments.cymbal.state === 'started') {
                        this.instruments.cymbal.stop();
                    }
                    this.instruments.cymbal.start(time);
                }
                break;
            case 'perc':
                if (this.instruments.perc.loaded) {
                    if (this.instruments.perc.state === 'started') {
                        this.instruments.perc.stop();
                    }
                    this.instruments.perc.start(time);
                }
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
            // Clear the scheduled sequence (handle ID === 0 correctly)
            if (this.sequenceId != null) {
                try {
                    this.transport.clear(this.sequenceId);
                } catch (e) {
                    console.warn('Failed to clear sequenceId on stop', this.sequenceId, e);
                }
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
        try {
            if (this.transport && this.transport.bpm) {
                this.transport.bpm.value = bpm;
            }
        } catch (e) {
            console.warn('Unable to set transport bpm:', e);
        }
        console.log(`Tempo set to ${bpm} BPM`);
    }

    /**
     * Set producer tag audio URL
     */
    setProducerTag(audioURL) {
        this.producerTagAudio = audioURL;
        if (audioURL) {
            this.producerTagPlayer = new Tone.Player(audioURL).toDestination();
            console.log('Producer tag audio loaded');
            // Clear any speech fallback when an actual audio URL is provided
            this.producerTagSpeech = null;
        } else {
            this.producerTagPlayer = null;
        }
    }

    /**
     * Use browser SpeechSynthesis for producer tag fallback
     */
    setProducerTagSpeech(spokenText) {
        if (typeof spokenText === 'string' && spokenText.trim().length > 0) {
            this.producerTagSpeech = spokenText.trim();
            console.log('Producer tag TTS text set:', this.producerTagSpeech);
        } else {
            this.producerTagSpeech = null;
        }
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
            cymbal: new Array(16).fill(false),
            perc: new Array(16).fill(false)
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

        // Generate cymbal pattern (accents and transitions)
        if (classification.hihat > 0.4 || classification.snare > 0.4) {
            // Cymbal crashes on major transitions
            patterns.cymbal[0] = Math.random() > 0.7;
            patterns.cymbal[8] = Math.random() > 0.6;
            
            if (classification.hihat > 0.6) {
                patterns.cymbal[15] = true; // Crash before loop
            }
        }

        // Generate perc pattern (adds texture)
        if (classification.hihat > 0.3 || classification.clap > 0.3) {
            // Percussion on off-beats for texture
            for (let i = 1; i < 16; i += 4) {
                patterns.perc[i] = Math.random() > 0.6;
            }
            
            if (classification.clap > 0.5) {
                patterns.perc[3] = true;
                patterns.perc[11] = true;
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

/**
* Change drum sample for a specific instrument
*/
async changeSample(instrument, filename) {
try {
console.log(`Changing ${instrument} sample to: ${filename}`);

// Dispose of old player
if (this.instruments[instrument]) {
this.instruments[instrument].dispose();
}

// Create path based on instrument type
let path = '';
switch(instrument) {
case 'kick':
path = `../drumset/kick/${filename}`;
break;
case 'snare':
path = `../drumset/snare/${filename}`;
break;
case 'hihat':
path = `../drumset/hat/${filename}`;
break;
case 'clap':
path = `../drumset/clap/${filename}`;
break;
case 'cymbal':
path = `../drumset/cymbal/${filename}`;
break;
case 'perc':
path = `../drumset/perc/${filename}`;
break;
default:
console.error('Unknown instrument:', instrument);
return false;
}

// Create new player
this.instruments[instrument] = new Tone.Player({
url: path,
onload: () => {
console.log(` ${instrument} sample loaded: ${filename}`);
},
onerror: (error) => {
console.error(` Failed to load ${instrument} sample:`, error);
}
}).toDestination();

// Wait for sample to load
await Tone.loaded();
console.log(` ${instrument} sample changed successfully`);
return true;

} catch (error) {
console.error(`Error changing ${instrument} sample:`, error);
return false;
}
}
}

// Export for use in other modules
window.AudioEngine = AudioEngine;