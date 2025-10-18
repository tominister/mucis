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
        
        // UI elements
        this.elements = {};
        
        // Bind methods
        this.handleRecordStart = this.handleRecordStart.bind(this);
        this.handleRecordStop = this.handleRecordStop.bind(this);
        this.handlePlayBeat = this.handlePlayBeat.bind(this);
        this.handleStopBeat = this.handleStopBeat.bind(this);
        this.handleTempoChange = this.handleTempoChange.bind(this);
        this.handlePromptSubmit = this.handlePromptSubmit.bind(this);
        this.handleQuickPrompt = this.handleQuickPrompt.bind(this);
        this.handleNarrate = this.handleNarrate.bind(this);
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
            
            // DJ controls
            djPrompt: safeGetElement('djPrompt'),
            applyPromptBtn: safeGetElement('applyPromptBtn'),
            quickPromptBtns: safeQuerySelectorAll('.quick-prompt-btn'),
            
            // AI response
            aiResponseText: safeGetElement('aiResponseText'),
            narrateBtn: safeGetElement('narrateBtn'),
            narrationPlayer: safeGetElement('narrationPlayer'),
            
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
                        this.updateBeatVisualization(step);
                    });
                    
                    // Initialize beat pattern visualizer
                    this.initializeBeatPattern();
                    
                    // Process any pending classification
                    if (this.pendingClassification) {
                        console.log('Processing pending classification...');
                        this.generateBeatFromClassification(this.pendingClassification);
                        this.pendingClassification = null;
                    }
                    
                    // Enable play button now that audio is ready
                    if (this.elements.playBeatBtn) {
                        this.elements.playBeatBtn.disabled = false;
                        console.log('✅ Audio ready - Play button enabled!');
                        
                        // Visual feedback
                        this.elements.playBeatBtn.textContent = '▶️ Play Beat (Ready!)';
                        setTimeout(() => {
                            this.elements.playBeatBtn.textContent = '▶️ Play Beat';
                        }, 2000);
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
        const instruments = ['kick', 'snare', 'hihat', 'clap'];
        
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
    handlePlayBeat() {
        if (!this.isInitialized) {
            console.log('App not initialized yet');
            return;
        }
        
        if (!this.audioEngine.isInitialized) {
            console.log('Click anywhere to activate audio first!');
            alert('Click anywhere on the page first to activate audio (Chrome requirement)');
            return;
        }
        
        try {
            this.audioEngine.play();
            if (this.elements.playBeatBtn) this.elements.playBeatBtn.disabled = true;
            if (this.elements.stopBeatBtn) this.elements.stopBeatBtn.disabled = false;
        } catch (error) {
            console.error('Error playing beat:', error);
            alert('Error playing beat. Try clicking anywhere to activate audio first.');
        }
    }

    /**
     * Handle stop beat
     */
    handleStopBeat() {
        try {
            if (this.audioEngine && this.audioEngine.isInitialized) {
                this.audioEngine.stop();
            }
            
            // Always re-enable play button
            if (this.elements.playBeatBtn) this.elements.playBeatBtn.disabled = false;
            if (this.elements.stopBeatBtn) this.elements.stopBeatBtn.disabled = true;
            
            // Reset visualization
            this.updateBeatVisualization(-1);
        } catch (error) {
            console.error('Error stopping beat:', error);
            // Still re-enable buttons even if there's an error
            if (this.elements.playBeatBtn) this.elements.playBeatBtn.disabled = false;
            if (this.elements.stopBeatBtn) this.elements.stopBeatBtn.disabled = true;
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
     * Handle narration generation
     */
    async handleNarrate() {
        const text = this.elements.aiResponseText.textContent;
        if (!text) return;
        
        this.elements.narrateBtn.disabled = true;
        this.elements.narrateBtn.textContent = 'Generating...';
        
        try {
            const audioURL = await this.apiClient.generateNarration(text);
            
            if (audioURL) {
                this.elements.narrationPlayer.src = audioURL;
                this.elements.narrationPlayer.style.display = 'block';
                this.elements.narrationPlayer.play();
            } else {
                // Fallback: use browser speech synthesis
                this.speakText(text);
            }
            
        } catch (error) {
            console.error('Error generating narration:', error);
            this.speakText(text);
        } finally {
            this.elements.narrateBtn.disabled = false;
            this.elements.narrateBtn.textContent = '🔊 Narrate with ElevenLabs';
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
        if (this.audioEngine.isInitialized) {
            const patterns = this.audioEngine.generatePatternFromClassification(classification);
            this.updateBeatPatternDisplay();
        } else {
            // Store classification for later when audio engine is ready
            this.pendingClassification = classification;
            console.log('Classification ready - click anywhere to activate audio and generate beat!');
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