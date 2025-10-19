/**
 * Main Application for SoundSketch.tech
 * Coordinates all components and handles UI interactions
 */

class SoundSketchApp {
    constructor() {
        // Core components
        this.audioEngine = new AudioEngine();
        this.aiClassifier = new AIClassifier();
        this.apiClient = new APIClient();
        
        // UI state
        this.isInitialized = false;
        this.recordingTimer = null;
        this.recordingStartTime = 0;
        this.isRamping = false;
        this.rampInterval = null;
        this.producerTagAudio = null;
        
        // UI elements
        this.elements = {};
        
        // Bind methods
        this.handleRecordStart = this.handleRecordStart.bind(this);
        this.handleRecordStop = this.handleRecordStop.bind(this);
        this.handlePlayBeat = this.handlePlayBeat.bind(this);
        this.handleStopBeat = this.handleStopBeat.bind(this);
        this.handleTempoChange = this.handleTempoChange.bind(this);
        this.handleRamp = this.handleRamp.bind(this);
        this.handlePromptSubmit = this.handlePromptSubmit.bind(this);
        this.handleQuickPrompt = this.handleQuickPrompt.bind(this);
        this.handleGenerateTag = this.handleGenerateTag.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Get UI elements first
            this.initializeUIElements();
            
            // Check if all required elements exist
            if (!this.elements.loadingOverlay || !this.elements.loadingText) {
                console.error('Required UI elements missing');
                alert('App initialization failed. Please refresh the page.');
                return;
            }
            
            this.showLoading('Initializing SoundSketch.tech...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize non-audio components first
            this.showLoading('Setting up AI classifier...');
            await this.aiClassifier.init();
            
            this.showLoading('Connecting to APIs...');
            await this.apiClient.init();
            
            // Set up audio activation (will initialize audio engine on first click)
            this.setupAudioContextActivation();
            
            // Set up callbacks
            this.setupCallbacks();
            
            // Initialize basic beat pattern visualizer (audio engine will be added later)
            this.initializeBeatPattern();
            
            this.isInitialized = true;
            this.hideLoading();
            
            // Show a friendly message about clicking to activate audio
            this.showAudioActivationMessage();
            
            console.log('🎵 SoundSketch.tech ready! Click anywhere to activate audio.');
            console.log('SoundSketch.tech initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize. Please refresh and try again.');
        }
    }

    /**
     * Get all UI elements
     */
    initializeUIElements() {
        // Helper function to safely get elements
        const safeGetElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with id '${id}' not found`);
            }
            return element;
        };

        const safeQuerySelector = (selector) => {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Element with selector '${selector}' not found`);
            }
            return element;
        };

        const safeQuerySelectorAll = (selector) => {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                console.warn(`No elements found with selector '${selector}'`);
            }
            return elements;
        };

        this.elements = {
            // Recording controls
            recordBtn: safeGetElement('recordBtn'),
            stopBtn: safeGetElement('stopBtn'),
            recordingTime: safeGetElement('recordingTime'),
            audioLevelMeter: safeGetElement('audioLevelMeter'),
            
            // Beat controls
            playBeatBtn: safeGetElement('playBeatBtn'),
            stopBeatBtn: safeGetElement('stopBeatBtn'),
            tempoSlider: safeGetElement('tempoSlider'),
            tempoValue: safeGetElement('tempoValue'),
            rampBtn: safeGetElement('rampBtn'),
            rampStartBPM: safeGetElement('rampStartBPM'),
            rampEndBPM: safeGetElement('rampEndBPM'),
            
            // DJ controls
            djPrompt: safeGetElement('djPrompt'),
            applyPromptBtn: safeGetElement('applyPromptBtn'),
            quickPromptBtns: safeQuerySelectorAll('.quick-prompt-btn'),
            
            // AI response
            aiResponseText: safeGetElement('aiResponseText'),
            narrationPlayer: safeGetElement('narrationPlayer'),
            
            // Sample selectors
            kickSelector: safeGetElement('kickSelector'),
            snareSelector: safeGetElement('snareSelector'),
            hihatSelector: safeGetElement('hihatSelector'),
            clapSelector: safeGetElement('clapSelector'),
            cymbalSelector: safeGetElement('cymbalSelector'),
            percSelector: safeGetElement('percSelector'),
            
            // Producer tag
            producerTag: safeGetElement('producerTag'),
            generateTagBtn: safeGetElement('generateTagBtn'),
            
            // Loading
            loadingOverlay: safeGetElement('loadingOverlay'),
            loadingText: safeGetElement('loadingText')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Helper function to safely add event listeners
        const safeAddEventListener = (element, event, handler) => {
            if (element && typeof element.addEventListener === 'function') {
                element.addEventListener(event, handler);
            } else {
                console.warn('Cannot add event listener to element:', element);
            }
        };

        // Recording controls
        safeAddEventListener(this.elements.recordBtn, 'click', this.handleRecordStart);
        safeAddEventListener(this.elements.stopBtn, 'click', this.handleRecordStop);
        
        // Beat controls
        safeAddEventListener(this.elements.playBeatBtn, 'click', this.handlePlayBeat);
        safeAddEventListener(this.elements.stopBeatBtn, 'click', this.handleStopBeat);
        safeAddEventListener(this.elements.tempoSlider, 'input', this.handleTempoChange);
        safeAddEventListener(this.elements.rampBtn, 'click', this.handleRamp);
        
        // DJ controls
        safeAddEventListener(this.elements.applyPromptBtn, 'click', this.handlePromptSubmit);
        safeAddEventListener(this.elements.djPrompt, 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePromptSubmit();
            }
        });
        
        // Quick prompts
        if (this.elements.quickPromptBtns && this.elements.quickPromptBtns.length > 0) {
            this.elements.quickPromptBtns.forEach(btn => {
                safeAddEventListener(btn, 'click', this.handleQuickPrompt);
            });
        }
        
        // Narration
        safeAddEventListener(this.elements.narrateBtn, 'click', this.handleNarrate);
        
        // Sample selectors
        safeAddEventListener(this.elements.kickSelector, 'change', (e) => {
            this.handleSampleChange('kick', e.target.value);
        });
        safeAddEventListener(this.elements.snareSelector, 'change', (e) => {
            this.handleSampleChange('snare', e.target.value);
        });
        safeAddEventListener(this.elements.hihatSelector, 'change', (e) => {
            this.handleSampleChange('hihat', e.target.value);
        });
        safeAddEventListener(this.elements.clapSelector, 'change', (e) => {
            this.handleSampleChange('clap', e.target.value);
        });
        safeAddEventListener(this.elements.cymbalSelector, 'change', (e) => {
            this.handleSampleChange('cymbal', e.target.value);
        });
        safeAddEventListener(this.elements.percSelector, 'change', (e) => {
            this.handleSampleChange('perc', e.target.value);
        });
        
        // Producer tag
        safeAddEventListener(this.elements.generateTagBtn, 'click', this.handleGenerateTag);
    }

    /**
     * Set up audio context activation (Chrome requirement)
     */
    setupAudioContextActivation() {
        let audioEngineInitialized = false;
        
        // Add a one-time click listener to activate audio context and initialize audio engine
        const activateAudio = async () => {
            try {
                if (!audioEngineInitialized) {
                    console.log('Initializing audio engine after user interaction...');
                    
                    // Start Tone.js audio context
                    await Tone.start();
                    console.log('Audio context activated');
                    
                    // Initialize audio engine
                    await this.audioEngine.init();
                    console.log('Audio engine initialized');
                    
                    // Set up audio engine callbacks
                    this.audioEngine.onStepChanged((step) => {
                        console.log('🎵 Step changed to:', step);
                        this.updateBeatVisualization(step);
                    });
                    
                    // Initialize beat pattern visualizer
                    this.initializeBeatPattern();
                    
                    // No need to process pending classification since we generate immediately
                    
                    // Enable play button now that audio is ready
                    if (this.elements.playBeatBtn) {
                        this.elements.playBeatBtn.disabled = false;
                        console.log('✅ Audio ready - Play button enabled!');
                    }
                    
                    audioEngineInitialized = true;
                }
                
                document.removeEventListener('click', activateAudio);
            } catch (error) {
                console.error('Error activating audio:', error);
            }
        };
        
        document.addEventListener('click', activateAudio, { once: true });
        
        // Also add listeners to common interactive elements
        const interactiveElements = [
            this.elements.recordBtn,
            this.elements.playBeatBtn,
            this.elements.applyPromptBtn
        ];
        
        interactiveElements.forEach(element => {
            if (element) {
                element.addEventListener('click', activateAudio, { once: true });
            }
        });
    }

    /**
     * Set up component callbacks
     */
    setupCallbacks() {
        // AI classification results
        this.aiClassifier.onClassificationResults((classification) => {
            this.updateClassificationDisplay(classification);
            this.generateBeatFromClassification(classification);
        });
        
        // Audio engine callbacks will be set up after user interaction
    }

    /**
     * Initialize beat pattern visualizer
     */
    initializeBeatPattern() {
        const instruments = ['kick', 'snare', 'hihat', 'clap', 'cymbal', 'perc'];
        
        instruments.forEach(instrument => {
            const stepsContainer = document.querySelector(`[data-instrument="${instrument}"] .pattern-steps`);
            if (!stepsContainer) {
                // Create steps container if it doesn't exist
                const patternRow = document.querySelector(`[data-instrument="${instrument}"]`);
                if (patternRow) {
                    const stepsDiv = document.createElement('div');
                    stepsDiv.className = 'pattern-steps';
                    patternRow.appendChild(stepsDiv);
                }
                return;
            }
            
            // Clear existing steps
            stepsContainer.innerHTML = '';
            
            // Create 16 steps
            for (let i = 0; i < 16; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                step.dataset.step = i;
                step.dataset.instrument = instrument;
                
                // Add click handler for manual editing
                step.addEventListener('click', () => {
                    this.toggleStep(instrument, i);
                });
                
                stepsContainer.appendChild(step);
            }
        });
    }

    /**
     * Handle record start
     */
    async handleRecordStart() {
        if (!this.isInitialized) return;
        
        const success = this.aiClassifier.startRecording();
        if (success) {
            this.elements.recordBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            
            // Start timer
            this.recordingStartTime = Date.now();
            this.recordingTimer = setInterval(() => {
                this.updateRecordingTime();
            }, 100);
        }
    }

    /**
     * Handle record stop
     */
    handleRecordStop() {
        this.aiClassifier.stopRecording();
        this.elements.recordBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        
        // Stop timer
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    /**
     * Update recording time display
     */
    updateRecordingTime() {
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 100);
        this.elements.recordingTime.textContent = 
            `${seconds.toString().padStart(2, '0')}:${milliseconds}`;
    }

    /**
     * Handle play beat
     */
    async handlePlayBeat() {
        // Single source of truth: audioEngine.isPlaying
        try {
            // If audio engine says it's playing, stop it (toggle behavior)
            if (this.audioEngine && this.audioEngine.isPlaying) {
                console.log('Transport already running - stopping');
                this.handleStopBeat();
                return;
            }

            // Ensure the app is initialized (UI/components)
            if (!this.isInitialized) {
                console.log('App not initialized yet');
                return;
            }

            // Ensure audio engine is initialized (Tone context + samples)
            if (!this.audioEngine.isInitialized) {
                console.log('Initializing audio engine from Play button...');
                await Tone.start();
                await this.audioEngine.init();

                // Wire up callbacks after init
                this.audioEngine.onStepChanged((step) => {
                    this.updateBeatVisualization(step);
                });

                // Initialize visualizer (idempotent)
                this.initializeBeatPattern();
            }

            // Start playback
            const started = this.audioEngine.play();
            if (started) {
                if (this.elements.playBeatBtn) {
                    this.elements.playBeatBtn.textContent = '⏸️ Pause';
                    this.elements.playBeatBtn.disabled = false;
                }
                if (this.elements.stopBeatBtn) this.elements.stopBeatBtn.disabled = false;
                console.log('✅ Beat started');
            } else {
                console.error('❌ audioEngine.play() returned false');
                alert('Failed to start playback');
            }
        } catch (err) {
            console.error('Error in handlePlayBeat:', err);
            alert('Error starting audio. Click anywhere to activate audio and retry.');
        }
    }

    /**
     * Handle stop beat
     */
    handleStopBeat() {
        console.log('⏹️ Stop button clicked - stopping beat...');

        try {
            if (this.audioEngine) {
                const success = this.audioEngine.stop();
                console.log('Audio engine stop result:', success);
            }

            // Stop any active ramping
            this.stopRamp();
            if (this.elements.rampBtn) {
                this.elements.rampBtn.textContent = '📈 Ramp';
            }

            // Reset play/stop button states
            if (this.elements.playBeatBtn) {
                this.elements.playBeatBtn.disabled = false;
                this.elements.playBeatBtn.textContent = '☀️ Play Beat';
                console.log('✅ Play button re-enabled and text reset');
            }
            if (this.elements.stopBeatBtn) {
                this.elements.stopBeatBtn.disabled = true;
                console.log('✅ Stop button disabled');
            }

            // Reset visualization
            this.updateBeatVisualization(-1);
            console.log('✅ Beat stopped and buttons reset');
            
        } catch (error) {
            console.error('Error stopping beat:', error);
            // Still re-enable buttons even if there's an error
            if (this.elements.playBeatBtn) {
                this.elements.playBeatBtn.disabled = false;
                console.log('✅ Play button force-enabled after error');
            }
            if (this.elements.stopBeatBtn) {
                this.elements.stopBeatBtn.disabled = true;
            }
        }
    }

    /**
     * Handle tempo change
     */
    handleTempoChange() {
        if (!this.elements.tempoSlider || !this.elements.tempoValue) return;
        
        const tempo = parseInt(this.elements.tempoSlider.value);
        this.elements.tempoValue.textContent = tempo;
        
        if (this.audioEngine.isInitialized) {
            this.audioEngine.setTempo(tempo);
        }
    }

    /**
     * Handle BPM ramping
     */
    handleRamp() {
        if (!this.audioEngine.isInitialized) {
            alert('Audio not initialized yet!');
            return;
        }

        const startBPM = parseInt(this.elements.rampStartBPM.value);
        const endBPM = parseInt(this.elements.rampEndBPM.value);

        if (isNaN(startBPM) || isNaN(endBPM) || startBPM < 60 || endBPM < 60 || startBPM > 200 || endBPM > 200) {
            alert('Please enter valid BPM values (60-200)');
            return;
        }

        if (this.isRamping) {
            this.stopRamp();
            this.elements.rampBtn.textContent = '📈 Ramp';
            return;
        }

        this.startRamp(startBPM, endBPM);
        this.elements.rampBtn.textContent = '⏹️ Stop Ramp';
    }

    /**
     * Start BPM ramping
     */
    startRamp(startBPM, endBPM) {
        console.log(`Starting BPM ramp from ${startBPM} to ${endBPM}`);

        this.isRamping = true;
        const bpmStep = 5; // Increment by 5 BPM each time
        const stepDuration = 1000; // 1 second per step

        let currentBPM = startBPM;

        this.rampInterval = setInterval(() => {
            if (!this.isRamping) return;

            // Update BPM
            this.audioEngine.setTempo(currentBPM);

            // Update UI
            if (this.elements.tempoSlider) {
                this.elements.tempoSlider.value = currentBPM;
            }
            if (this.elements.tempoValue) {
                this.elements.tempoValue.textContent = currentBPM;
            }

            // Calculate next BPM step
            if (startBPM < endBPM) {
                currentBPM += bpmStep;
                if (currentBPM >= endBPM) {
                    currentBPM = endBPM;
                    this.stopRamp();
                    this.elements.rampBtn.textContent = '📈 Ramp';
                    console.log('BPM ramp completed');
                }
            } else {
                currentBPM -= bpmStep;
                if (currentBPM <= endBPM) {
                    currentBPM = endBPM;
                    this.stopRamp();
                    this.elements.rampBtn.textContent = '📈 Ramp';
                    console.log('BPM ramp completed');
                }
            }
        }, stepDuration);
    }

    /**
     * Stop BPM ramping
     */
    stopRamp() {
        this.isRamping = false;
        if (this.rampInterval) {
            clearInterval(this.rampInterval);
            this.rampInterval = null;
        }
        console.log('BPM ramp stopped');
    }

    /**
     * Handle prompt submission
     */
    async handlePromptSubmit() {
        const prompt = this.elements.djPrompt.value.trim();
        if (!prompt) return;
        
        this.elements.applyPromptBtn.disabled = true;
        this.elements.applyPromptBtn.textContent = 'Processing...';
        
        try {
            const currentPatterns = this.audioEngine.getPatterns();
            const result = await this.apiClient.processPromptWithGemini(prompt, currentPatterns);
            
            if (result.success) {
                // Apply modifications
                this.audioEngine.applyDJModifications(result.modifications);
                this.updateBeatPatternDisplay();
                
                // Update AI response
                this.elements.aiResponseText.textContent = result.explanation;
                this.elements.narrateBtn.disabled = false;
                
                // Clear prompt
                this.elements.djPrompt.value = '';
            }
            
        } catch (error) {
            console.error('Error processing prompt:', error);
            this.elements.aiResponseText.textContent = 'Error processing prompt. Please try again.';
        } finally {
            this.elements.applyPromptBtn.disabled = false;
            this.elements.applyPromptBtn.textContent = '🤖 Apply with Gemini';
        }
    }

    /**
     * Handle quick prompt clicks
     */
    handleQuickPrompt(event) {
        const prompt = event.target.dataset.prompt;
        this.elements.djPrompt.value = prompt;
        this.handlePromptSubmit();
    }

    /**
     * Handle producer tag generation
     */
    async handleGenerateTag() {
        const tag = this.elements.producerTag.value.trim();
        if (!tag) {
            alert('Please enter a producer tag');
            return;
        }

        this.elements.generateTagBtn.disabled = true;
        this.elements.generateTagBtn.textContent = 'Generating...';

        try {
            const audioURL = await this.apiClient.generateProducerTag(tag);

            if (audioURL) {
                // Store the tag audio for playback at the start of each loop
                this.producerTagAudio = audioURL;
                this.audioEngine.setProducerTag(audioURL);
                this.elements.generateTagBtn.textContent = '✅ Tag Generated!';
                setTimeout(() => {
                    this.elements.generateTagBtn.textContent = '🎵 Generate Tag';
                }, 2000);
            } else {
                // Backend didn't return an audio URL — use SpeechSynthesis fallback
                console.warn('No audio URL returned from API — using SpeechSynthesis fallback for producer tag');
                this.producerTagAudio = null;
                // Store a simple default if user didn't type anything — keep their tag otherwise
                const spokenTag = tag || 'hey astro';
                this.audioEngine.setProducerTagSpeech(spokenTag);
                this.elements.generateTagBtn.textContent = '✅ Tag Ready (TTS)';
                setTimeout(() => {
                    this.elements.generateTagBtn.textContent = '🎵 Generate Tag';
                }, 2000);
            }

        } catch (error) {
            console.error('Error generating producer tag:', error);
            alert('Error generating producer tag. Please try again.');
        } finally {
            this.elements.generateTagBtn.disabled = false;
        }
    }

    /**
     * Fallback text-to-speech using browser API
     */
    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            speechSynthesis.speak(utterance);
        }
    }

    /**
     * Update classification display
     */
    updateClassificationDisplay(classification) {
        Object.keys(classification).forEach(instrument => {
            const confidence = Math.round(classification[instrument] * 100);
            const fillElement = document.querySelector(`.${instrument}-fill`);
            const textElement = fillElement?.parentElement.nextElementSibling;
            
            if (fillElement) {
                fillElement.style.width = `${confidence}%`;
            }
            
            if (textElement) {
                textElement.textContent = `${confidence}%`;
            }
        });
    }

    /**
     * Generate beat from classification
     */
    generateBeatFromClassification(classification) {
        // Generate patterns regardless of audio engine initialization
        const patterns = this.audioEngine.generatePatternFromClassification(classification);
        
        // Update the patterns in the audio engine
        Object.keys(patterns).forEach(instrument => {
            if (this.audioEngine.patterns[instrument]) {
                this.audioEngine.patterns[instrument] = patterns[instrument];
            }
        });
        
        // Update the visual display
        this.updateBeatPatternDisplay();
        
        console.log('✅ Beat generated from classification!');
        
        // Enable Play button so the user can activate audio and play immediately
        if (this.elements.playBeatBtn) {
            this.elements.playBeatBtn.disabled = false;
            this.elements.playBeatBtn.textContent = '☀️ Play Beat';
            console.log('Play button enabled after beat generation');
        }

        // If audio engine is not yet initialized, user still needs to click anywhere
        if (!this.audioEngine.isInitialized) {
            console.log('Audio not ready yet - patterns saved for when you click to play!');
        }
    }

    /**
     * Update beat pattern display
     */
    updateBeatPatternDisplay() {
        const patterns = this.audioEngine.getPatterns();
        
        Object.keys(patterns).forEach(instrument => {
            const steps = document.querySelectorAll(`[data-instrument="${instrument}"] .step`);
            steps.forEach((step, index) => {
                step.classList.toggle('active', patterns[instrument][index]);
            });
        });
    }

    /**
     * Update beat visualization (current step highlight)
     */
    updateBeatVisualization(currentStep) {
        // Remove current step highlight from all steps
        document.querySelectorAll('.step.current').forEach(step => {
            step.classList.remove('current');
        });
        
        // Highlight current step
        if (currentStep >= 0) {
            document.querySelectorAll(`[data-step="${currentStep}"]`).forEach(step => {
                step.classList.add('current');
            });
        }
    }

    /**
     * Toggle a step in the pattern
     */
    toggleStep(instrument, stepIndex) {
        const patterns = this.audioEngine.getPatterns();
        patterns[instrument][stepIndex] = !patterns[instrument][stepIndex];
        this.audioEngine.updatePattern(instrument, patterns[instrument]);
        this.updateBeatPatternDisplay();
    }

    /**
     * Show loading overlay
     */
    showLoading(message) {
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = message;
        }
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        } else {
            console.log('Loading:', message);
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show audio activation message
     */
    showAudioActivationMessage() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3498db;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.5s ease;
        `;
        notification.innerHTML = `
            🎵 <strong>Click anywhere to activate audio & enable play button!</strong><br>
            <small>Required for Chrome's autoplay policy</small>
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#audioNotificationStyles')) {
            const styles = document.createElement('style');
            styles.id = 'audioNotificationStyles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after audio is activated or 10 seconds
        const removeNotification = () => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.5s ease reverse';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 500);
            }
        };
        
        // Remove on click anywhere
        const clickHandler = () => {
            removeNotification();
            document.removeEventListener('click', clickHandler);
        };
        
        document.addEventListener('click', clickHandler, { once: true });
        
        // Auto-remove after 10 seconds
        setTimeout(removeNotification, 10000);
    }

    /**
     * Handle sample change from dropdown
     */
    async handleSampleChange(instrument, filename) {
        try {
            console.log(`Changing ${instrument} sample to: ${filename}`);
            
            // Show loading indicator
            this.showLoading(`Loading ${instrument} sample...`);
            
            // Change the sample in audio engine
            const success = await this.audioEngine.changeSample(instrument, filename);
            
            if (success) {
                console.log(` ${instrument} sample changed successfully`);
            } else {
                console.error(` Failed to change ${instrument} sample`);
            }
            
            this.hideLoading();
        } catch (error) {
            console.error(`Error changing ${instrument} sample:`, error);
            this.hideLoading();
            this.showError(`Failed to load ${instrument} sample`);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        alert(message); // Replace with better error UI later
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const app = new SoundSketchApp();
    await app.init();
    
    // Make app globally available for debugging
    window.soundSketchApp = app;
});

// Export for use in other modules
window.SoundSketchApp = SoundSketchApp;