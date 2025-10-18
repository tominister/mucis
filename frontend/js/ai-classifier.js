/**
 * AI Classifier for SoundSketch.tech
 * Handles audio recording, processing, and classification using TensorFlow.js
 */

class AIClassifier {
    constructor() {
        this.model = null;
        this.metadata = null;
        this.isModelLoaded = false;
        this.isRecording = false;
        
        // Audio recording setup
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        
        // Model URL - Replace with your Teachable Machine model URL
        this.modelURL = './models/tm-audio-model/model.json';
        this.metadataURL = './models/tm-audio-model/metadata.json';
        
        // Classification results
        this.lastClassification = {
            kick: 0,
            snare: 0,
            hihat: 0,
            clap: 0
        };
        
        // Callbacks
        this.onClassificationResult = null;
        this.onRecordingUpdate = null;
    }

    /**
     * Initialize the AI classifier
     */
    async init() {
        try {
            console.log('Initializing AI classifier...');
            
            // Load the Teachable Machine model
            await this.loadModel();
            
            // Set up audio recording
            await this.setupAudioRecording();
            
            console.log('AI classifier initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize AI classifier:', error);
            // Fallback: Use mock classification for demo
            await this.setupMockClassifier();
            return false;
        }
    }

    /**
     * Load the Teachable Machine model
     */
    async loadModel() {
        try {
            // Check if model files exist, otherwise use mock
            const response = await fetch(this.modelURL);
            if (!response.ok) {
                throw new Error('Model file not found');
            }
            
            // Load model and metadata
            this.model = await tmAudio.load(this.modelURL, this.metadataURL);
            this.isModelLoaded = true;
            console.log('Teachable Machine model loaded successfully');
            
        } catch (error) {
            console.log('📝 No custom model found - using built-in demo classifier (this is normal!)');
            console.log('💡 To train your own model, visit: https://teachablemachine.withgoogle.com/train/audio');
            await this.setupMockClassifier();
        }
    }

    /**
     * Set up mock classifier for demo purposes
     */
    async setupMockClassifier() {
        this.isModelLoaded = false;
        console.log('Using mock classifier for demo');
        
        // Still need to set up audio recording even in mock mode
        try {
            await this.setupAudioRecording();
            console.log('Mock classifier with audio recording ready');
        } catch (error) {
            console.error('Failed to setup audio recording for mock classifier:', error);
        }
    }

    /**
     * Set up audio recording capabilities
     */
    async setupAudioRecording() {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    sampleRate: 44100
                }
            });

            // Create audio context for analysis
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            this.analyser = this.audioContext.createAnalyser();
            
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            source.connect(this.analyser);

            // Set up MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.audioStream);
            this.setupMediaRecorderEvents();
            
            console.log('Audio recording setup complete');
            
        } catch (error) {
            console.error('Failed to setup audio recording:', error);
            throw error;
        }
    }

    /**
     * Set up MediaRecorder event handlers
     */
    setupMediaRecorderEvents() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            console.log('Recording stopped, processing audio...');
            await this.processRecording();
        };

        this.mediaRecorder.onstart = () => {
            console.log('Recording started');
            this.audioChunks = [];
        };
    }

    /**
     * Start recording audio
     */
    startRecording() {
        if (!this.mediaRecorder) {
            console.error('MediaRecorder not initialized');
            return false;
        }

        try {
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Start visual feedback
            this.startAudioVisualization();
            
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    /**
     * Stop recording audio
     */
    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            return false;
        }

        try {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop visual feedback
            this.stopAudioVisualization();
            
            return true;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return false;
        }
    }

    /**
     * Process the recorded audio and classify it
     */
    async processRecording() {
        try {
            // Create audio blob from chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            if (this.isModelLoaded && this.model) {
                // Use real Teachable Machine model
                await this.classifyWithModel(audioBlob);
            } else {
                // Use mock classification
                this.mockClassification();
            }
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.mockClassification();
        }
    }

    /**
     * Classify audio using the loaded Teachable Machine model
     */
    async classifyWithModel(audioBlob) {
        try {
            // Convert blob to audio buffer
            const audioBuffer = await this.blobToAudioBuffer(audioBlob);
            
            // Classify the audio
            const predictions = await this.model.classify(audioBuffer);
            
            // Process predictions
            const classification = this.processPredictions(predictions);
            this.updateClassificationResults(classification);
            
        } catch (error) {
            console.error('Error in model classification:', error);
            this.mockClassification();
        }
    }

    /**
     * Convert blob to audio buffer for TensorFlow.js
     */
    async blobToAudioBuffer(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    /**
     * Process model predictions into classification results
     */
    processPredictions(predictions) {
        const classification = {
            kick: 0,
            snare: 0,
            hihat: 0,
            clap: 0
        };

        // Map predictions to our instrument classes
        predictions.forEach(prediction => {
            const className = prediction.className.toLowerCase();
            const probability = prediction.probability;
            
            if (className.includes('kick') || className.includes('bass')) {
                classification.kick = Math.max(classification.kick, probability);
            } else if (className.includes('snare')) {
                classification.snare = Math.max(classification.snare, probability);
            } else if (className.includes('hat') || className.includes('hihat')) {
                classification.hihat = Math.max(classification.hihat, probability);
            } else if (className.includes('clap')) {
                classification.clap = Math.max(classification.clap, probability);
            }
        });

        return classification;
    }

    /**
     * Mock classification for demo purposes
     */
    mockClassification() {
        // Create consistent, demo-friendly classification results
        const classification = {
            kick: 0.75,    // Strong kick detection
            snare: 0.65,   // Good snare detection  
            hihat: 0.85,   // High hi-hat detection
            clap: 0.45     // Moderate clap detection
        };

        console.log('🎵 Demo classification generated:', classification);
        console.log('💡 This creates a classic boom-tss pattern perfect for demos!');

        // Animate the confidence bars smoothly
        setTimeout(() => {
            this.updateClassificationResults(classification);
        }, 500); // Small delay for visual effect
    }

    /**
     * Update classification results and notify listeners
     */
    updateClassificationResults(classification) {
        this.lastClassification = { ...classification };
        
        console.log('Classification results:', classification);
        
        // Notify callback
        if (this.onClassificationResult) {
            this.onClassificationResult(classification);
        }
    }

    /**
     * Start audio visualization during recording
     */
    startAudioVisualization() {
        if (!this.analyser) return;

        const canvas = document.getElementById('waveform');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.isRecording) return;

            requestAnimationFrame(draw);

            this.analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#3498db';
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.stroke();

            // Update audio level meter
            this.updateAudioLevel(dataArray);
        };

        draw();
    }

    /**
     * Update audio level meter
     */
    updateAudioLevel(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / dataArray.length;
        const level = (average / 128) * 100;

        const meter = document.getElementById('audioLevelMeter');
        if (meter) {
            meter.style.setProperty('--level', `${Math.min(level, 100)}%`);
        }
    }

    /**
     * Stop audio visualization
     */
    stopAudioVisualization() {
        const canvas = document.getElementById('waveform');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Get the last classification results
     */
    getLastClassification() {
        return { ...this.lastClassification };
    }

    /**
     * Set classification result callback
     */
    onClassificationResults(callback) {
        this.onClassificationResult = callback;
    }

    /**
     * Check if recording is active
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * Get initialization status
     */
    getIsInitialized() {
        return this.audioStream !== null;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
window.AIClassifier = AIClassifier;