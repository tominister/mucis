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
        
        // Model URL - Prefer the project's `music_model` if present
        this.modelURL = '/models/music_model/model.json';
        this.metadataURL = '/models/music_model/metadata.json';
        
        // Classification results
        this.lastClassification = {
            kick: 0,
            snare: 0,
            hihat: 0,
            clap: 0
        };

        // Model class mapping: map model class names -> target instruments
        // Keys are instrument names: kick/snare/hihat/clap; values are model className strings
        this.classMapping = {
            kick: null,
            snare: null,
            hihat: null,
            clap: null
        };

        // Probability threshold for accepting model prediction
        this.modelThreshold = 0.4;
    // Energy gate: ignore very-low-energy slices (RMS)
    this.energyThreshold = 0.006;

    // Onset detection settings
    this.useOnsetDetection = false;
    this.onsetWindowMs = 400; // ms window centered on onset to classify
        
        // Callbacks
        this.onClassificationResult = null;
        this.onStepClassificationCallback = null; // internal storage for per-step matrix callback
        this.onRecordingUpdate = null;

        // Dataset collection storage
        this.dataset = {
            label: null,
            examples: [] // { label, blob, timestamp }
        };

        // Debugging
        this.debugPredictions = false;
        // Hihat suppression: multiply hat votes by this factor (0 = never, 1 = normal)
        this.hihatSuppression = 0.01; // set very low to make hihat detection nearly unattainable by default
    }

    /**
     * Start a labeled dataset recording session. Subsequent recordings will be saved with this label.
     */
    startDatasetLabel(label) {
        this.dataset.label = String(label || 'unlabeled');
        console.log('Dataset label set to', this.dataset.label);
    }

    /**
     * Save the last recorded audio blob into the dataset with the active label
     */
    async saveLastRecordingToDataset() {
        try {
            if (!this.audioChunks || this.audioChunks.length === 0) {
                console.warn('No audio to save');
                return false;
            }
            const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
            this.dataset.examples.push({ label: this.dataset.label || 'unlabeled', blob, timestamp: Date.now() });
            console.log('Saved example to dataset:', this.dataset.label, 'examples count:', this.dataset.examples.length);
            return true;
        } catch (e) {
            console.error('Failed to save recording to dataset', e);
            return false;
        }
    }

    /**
     * Export the dataset as a ZIP of WAV files named by label/timestamp
     */
    async exportDatasetZip() {
        if (!this.dataset.examples || this.dataset.examples.length === 0) {
            console.warn('No examples to export');
            return false;
        }

        const zip = new JSZip();
        this.dataset.examples.forEach((ex, idx) => {
            const filename = `${ex.label}_${ex.timestamp}_${idx}.wav`;
            zip.file(filename, ex.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `soundsketch_dataset_${Date.now()}.zip`);
        return true;
    }

    /**
     * Register a callback for standard classification results
     */
    onClassificationResults(cb) {
        this.onClassificationResult = cb;
    }

    /**
     * Register a callback for per-step (16-step) classification matrix
     * Use: aiClassifier.onStepClassification(fn)
     */
    onStepClassification(cb) {
        this.onStepClassificationCallback = cb;
    }

    /**
     * Initialize the AI classifier
     */
    async init() {
        try {
            console.log('Initializing AI classifier...');
            
            // Load the Teachable Machine model
            await this.loadModel();
            
            // Note: Do NOT request microphone access here. Defer to startRecording()
            // so that browsers only prompt after a user gesture.
            
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
            // Try to read class labels from metadata if available
            try {
                const metaResp = await fetch(this.metadataURL);
                if (metaResp.ok) {
                    this.metadata = await metaResp.json();
                    this.modelClasses = this.metadata?.labels || (this.model?.model?.classes || []);
                    // Auto-map common instrument keywords to model classes when possible
                    const labels = (this.modelClasses || []).map(l => String(l || '').toLowerCase());
                    const mapping = {};
                    const findLabel = (kws) => {
                        for (const kw of kws) {
                            const idx = labels.findIndex(l => l.includes(kw));
                            if (idx !== -1) return this.modelClasses[idx];
                        }
                        return null;
                    };
                    mapping.kick = findLabel(['kick']);
                    mapping.snare = findLabel(['snare']);
                    mapping.hihat = findLabel(['hat','hi hat','hihat']);
                    mapping.clap = findLabel(['clap']);
                    this.classMapping = { ...this.classMapping, ...mapping };
                    console.log('Model classes:', this.modelClasses);
                }
            } catch (e) {
                console.warn('Failed to read metadata.json', e);
            }
            console.log('Teachable Machine model loaded successfully');
            
        } catch (error) {
            console.log('📝 No custom model found - using built-in demo classifier (this is normal!)');
            console.log('💡 To train your own model, visit: https://teachablemachine.withgoogle.com/train/audio');
            // Use mock classifier but do not request microphone yet. startRecording() will
            // request microphone access when the user presses the record button.
            await this.setupMockClassifier();
        }
    }

    /**
     * Set up mock classifier for demo purposes
     */
    async setupMockClassifier() {
        this.isModelLoaded = false;
        console.log('Using mock classifier for demo');
        // Do not set up audio recording here; defer to user action to avoid permission prompts
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
            // Try to set up audio recording now (will prompt for permission)
            try {
                // setupAudioRecording will create mediaRecorder and analyser
                this.setupAudioRecording().then(() => {
                    try {
                        this.mediaRecorder.start();
                        this.isRecording = true;
                        this.startAudioVisualization();
                    } catch (err) {
                        console.error('Failed to start recording after setup:', err);
                    }
                }).catch(err => {
                    console.error('Microphone setup failed:', err);
                });
                return true; // indicate that recording has been initiated (async)
            } catch (e) {
                console.error('Failed to initialize MediaRecorder:', e);
                return false;
            }
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
            
            // If onset detection enabled, detect onsets and classify around them
            if (this.useOnsetDetection) {
                const onsetResult = await this.classifyWithOnsets(audioBlob, 16);
                if (onsetResult && this.onStepClassificationCallback) {
                    this.onStepClassificationCallback(onsetResult);
                    return;
                }
            }

            // Otherwise prefer per-step classification (quantize into 16 steps)
            const steps = 16;
            const perStepResult = await this.classifyPerStep(audioBlob, steps);
            if (perStepResult && this.onStepClassificationCallback) {
                this.onStepClassificationCallback(perStepResult);
            } else if (this.isModelLoaded && this.model) {
                // Fallback to whole-clip classification
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
     * Simple energy-based onset detector and classifier around each detected onset.
     * Returns a 16-step matrix with hits placed at nearest step indices.
     */
    async classifyWithOnsets(audioBlob, steps = 16) {
        try {
            const audioBuffer = await this.blobToAudioBuffer(audioBlob);
            const sr = audioBuffer.sampleRate;
            const data = audioBuffer.getChannelData(0);

            // Short-time energy (frame size 1024)
            const frameSize = 1024;
            const hop = 512;
            const energies = [];
            for (let i = 0; i + frameSize < data.length; i += hop) {
                let sum = 0;
                for (let j = 0; j < frameSize; j++) {
                    const v = data[i + j] || 0;
                    sum += v * v;
                }
                energies.push(Math.sqrt(sum / frameSize));
            }

            // Simple median-based adaptive threshold for onset detection
            const sorted = [...energies].sort((a,b)=>a-b);
            const median = sorted[Math.floor(sorted.length/2)] || 0;
            const onsetThresh = Math.max(this.energyThreshold, median * 3);

            const onsetFrames = [];
            for (let i = 1; i < energies.length - 1; i++) {
                if (energies[i] > onsetThresh && energies[i] > energies[i-1] && energies[i] >= energies[i+1]) {
                    onsetFrames.push(i);
                }
            }

            if (this.debugPredictions) console.log('Detected onset frames:', onsetFrames.length);

            // Convert frames to times and classify centered windows
            const hits = [];
            for (const f of onsetFrames) {
                const centerSample = f * hop + Math.floor(frameSize/2);
                const halfWindow = Math.floor((this.onsetWindowMs/1000) * sr / 2);
                const start = Math.max(0, centerSample - halfWindow);
                const end = Math.min(data.length, centerSample + halfWindow);
                const buf = this.audioContext.createBuffer(1, end - start, sr);
                const out = buf.getChannelData(0);
                for (let k = start; k < end; k++) out[k - start] = data[k] || 0;

                // Classify this window with model (or heuristic)
                let detected = null;
                if (this.isModelLoaded && this.model) {
                    try {
                        const preds = await this.model.classify(buf);
                        if (this.debugPredictions) console.log('Onset preds:', preds);
                        if (preds && preds.length) {
                            const top = preds.reduce((a,b)=>(a.probability>b.probability?a:b));
                            if (top.probability >= this.modelThreshold) {
                                const cname = top.className.toLowerCase();
                                if (cname.includes('kick')) detected = 'kick';
                                if (cname.includes('snare')) detected = 'snare';
                                if (cname.includes('hat')||cname.includes('hihat')) detected = 'hihat';
                                if (cname.includes('clap')) detected = 'clap';
                            }
                        }
                    } catch (e) {
                        console.warn('Onset model classify failed', e);
                    }
                }
                if (!detected) {
                    detected = this.classifySliceHeuristic(buf);
                }

                if (detected) {
                    // place hit at nearest step
                    const t = centerSample / sr;
                    const stepIdx = Math.round((t / audioBuffer.duration) * steps) % steps;
                    hits.push({ step: stepIdx, inst: detected });
                }
            }

            // Build matrix
            let matrix = { kick: new Array(steps).fill(0), snare: new Array(steps).fill(0), hihat: new Array(steps).fill(0), clap: new Array(steps).fill(0) };
            hits.forEach(h => { matrix[h.inst][h.step] = 1; });
            matrix = this.postProcessMatrixConvertAdjacentHihats(matrix);
            return { matrix };
        } catch (err) {
            console.error('Error in classifyWithOnsets:', err);
            return null;
        }
    }

    /**
     * Post-process a 4xN matrix: convert adjacent hihat pairs into a kick at the first step
     */
    postProcessMatrixConvertAdjacentHihats(matrix) {
        try {
            const steps = matrix.hihat.length;
            for (let i = 0; i < steps; i++) {
                const next = (i + 1) % steps;
                if (matrix.hihat[i] && matrix.hihat[next]) {
                    // remove the two hihats and place a kick at i
                    matrix.hihat[i] = 0;
                    matrix.hihat[next] = 0;
                    matrix.kick[i] = 1;
                }
            }
        } catch (e) {
            console.warn('postProcessMatrixConvertAdjacentHihats failed', e);
        }
        return matrix;
    }

    /**
     * Classify an audio blob into a per-step matrix (kick/snare/hihat/clap)
     * Returns an object: { kick: [0/1*16], snare: [...], hihat: [...], clap: [...] }
     */
    async classifyPerStep(audioBlob, steps = 16) {
        try {
            const audioBuffer = await this.blobToAudioBuffer(audioBlob);

            const duration = audioBuffer.duration;
            if (duration <= 0) {
                throw new Error('Invalid audio duration');
            }

            // Prepare empty matrices
            const matrix = {
                kick: new Array(steps).fill(0),
                snare: new Array(steps).fill(0),
                hihat: new Array(steps).fill(0),
                clap: new Array(steps).fill(0)
            };

            // For each step, process overlapping sub-slices and aggregate decisions
            const subSlices = 3; // number of overlapping sub-windows per step
            const overlapFactor = 0.5; // amount each sub-slice overlaps (0-1)

            for (let i = 0; i < steps; i++) {
                const stepStart = (i / steps) * duration;
                const stepEnd = ((i + 1) / steps) * duration;
                const stepLen = stepEnd - stepStart;

                // Accumulators for model votes and features
                const votes = { kick: 0, snare: 0, hihat: 0, clap: 0 };
                let validWindows = 0;
                const rmsList = [];
                const centroidList = [];

                for (let s = 0; s < subSlices; s++) {
                    const windowCenter = stepStart + (s + 0.5) * (stepLen / subSlices);
                    const winHalf = (stepLen / subSlices) * (0.5 + overlapFactor * 0.5);
                    const wStart = Math.max(0, windowCenter - winHalf);
                    const wEnd = Math.min(duration, windowCenter + winHalf);

                    const sliceBuffer = this.sliceAudioBuffer(audioBuffer, wStart, wEnd);

                    // Compute slice features (rms + crude spectral centroid)
                    const feats = this.computeSliceFeatures(sliceBuffer);
                    const rms = feats.rms;
                    const specCentroid = feats.centroid;

                    // Energy gate: skip very quiet windows
                    if (rms < this.energyThreshold) {
                        if (this.debugPredictions) console.log(`Step ${i} sub ${s} ignored (low energy) rms=${rms}`);
                        continue;
                    }

                    validWindows++;
                    rmsList.push(rms);
                    centroidList.push(specCentroid);

                    // If model available, get predictions for this slice
                    if (this.isModelLoaded && this.model) {
                        try {
                            const predictions = await this.model.classify(sliceBuffer);
                            if (this.debugPredictions) console.log(`Step ${i} sub ${s} preds:`, predictions, 'rms=', rms, 'centroid=', specCentroid);

                            // Aggregate top predictions above threshold
                            if (predictions && predictions.length > 0) {
                                const top = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
                                if (top.probability >= this.modelThreshold) {
                                    const cname = top.className;
                                    const mapped = Object.keys(this.classMapping).find(inst => {
                                        const cls = this.classMapping[inst];
                                        return cls && cls.toLowerCase() === cname.toLowerCase();
                                    });
                                    let detected = mapped || null;
                                    if (!detected) {
                                        const lc = cname.toLowerCase();
                                        if (lc.includes('kick')) detected = 'kick';
                                        if (lc.includes('snare')) detected = 'snare';
                                        if (lc.includes('hat') || lc.includes('hihat')) detected = 'hihat';
                                        if (lc.includes('clap')) detected = 'clap';
                                    }
                                    if (detected) votes[detected]++;
                                }
                            }
                        } catch (e) {
                            console.warn('Model classify slice failed', e);
                        }
                    } else {
                        // No model: use heuristic per sub-slice
                        const heur = this.classifySliceHeuristic(sliceBuffer);
                        if (this.debugPredictions) console.log(`Step ${i} sub ${s} heuristic ->`, heur, 'rms=', rms, 'centroid=', specCentroid);
                        if (heur) votes[heur]++;
                    }
                }

                // Decide based on votes and valid windows
                if (validWindows > 0) {
                    // Compute mean features
                    const meanRms = rmsList.reduce((s, v) => s + v, 0) / rmsList.length;
                    const meanCentroid = centroidList.reduce((s, v) => s + v, 0) / centroidList.length;

                    // Downweight hi-hat votes to reduce false positives (hats are easy to mis-detect)
                    const adjustedVotes = { ...votes };
                    adjustedVotes.hihat = adjustedVotes.hihat * (this.hihatSuppression || 0.4); // reduce hat influence (configurable)

                    // Forced override: a single hihat vote with high energy and low centroid is likely a kick
                    if (votes.hihat === 1 && votes.kick === 0 && votes.snare === 0 && votes.clap === 0 && meanRms > 0.012 && meanCentroid < 90) {
                        if (this.debugPredictions) console.log(`Step ${i} forced kick override (single hat vote, meanRms=${meanRms.toFixed(4)}, meanCentroid=${meanCentroid.toFixed(1)})`);
                        matrix['kick'][i] = 1;
                        continue;
                    }

                    // Pick instrument with max adjusted votes
                    let maxInst = Object.keys(adjustedVotes).reduce((a, b) => adjustedVotes[a] > adjustedVotes[b] ? a : b);

                    // If top adjusted vote is zero, skip
                    if (adjustedVotes[maxInst] <= 0) continue;

                    // Second override: if hi-hat still top but energy is high and centroid low, prefer kick
                    if (maxInst === 'hihat' && meanRms > 0.02 && meanCentroid < 70) {
                        if (this.debugPredictions) console.log(`Step ${i} override hihat->kick (meanRms=${meanRms.toFixed(4)}, meanCentroid=${meanCentroid.toFixed(1)})`);
                        maxInst = 'kick';
                    }

                    // Final decision
                    matrix[maxInst][i] = 1;

                    if (this.debugPredictions) {
                        console.log(`Step ${i} votes=`, votes, 'adjusted=', adjustedVotes, `meanRms=${meanRms.toFixed(4)} meanCentroid=${meanCentroid.toFixed(1)} -> chosen=${maxInst}`);
                    }
                }
            }

            const finalMatrix = this.postProcessMatrixConvertAdjacentHihats(matrix);
            return { matrix: finalMatrix };
        } catch (err) {
            console.error('Error in classifyPerStep:', err);
            return null;
        }
    }

    setDebugPredictions(enabled) {
        this.debugPredictions = !!enabled;
    }

    setUseOnsetDetection(enabled) {
        this.useOnsetDetection = !!enabled;
    }

    setOnsetWindowMs(ms) {
        const n = Number(ms);
        if (!isNaN(n) && n >= 50) this.onsetWindowMs = n;
    }

    setEnergyThreshold(v) {
        const num = Number(v);
        if (!isNaN(num)) this.energyThreshold = Math.max(0, num);
    }

    /**
     * Set mapping from instruments to model class names
     * mapping = { kick: 'Kick', snare: 'Snare', hihat: 'HiHat', clap: 'Clap' }
     */
    setClassMapping(mapping) {
        this.classMapping = { ...this.classMapping, ...mapping };
    }

    getClassMapping() {
        return { ...this.classMapping };
    }

    setModelThreshold(v) {
        const num = Number(v);
        if (!isNaN(num)) this.modelThreshold = Math.max(0, Math.min(1, num));
    }

    getModelThreshold() {
        return this.modelThreshold;
    }

    setHihatSuppression(v) {
        const num = Number(v);
        if (!isNaN(num) && num >= 0 && num <= 1) {
            this.hihatSuppression = num;
        }
    }

    getHihatSuppression() {
        return this.hihatSuppression;
    }

    /**
     * Slice an AudioBuffer into a new AudioBuffer between startTime and endTime (seconds)
     */
    sliceAudioBuffer(audioBuffer, startTime, endTime) {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const frameCount = Math.max(0, endSample - startSample);

        const numChannels = audioBuffer.numberOfChannels;
        const newBuffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        for (let ch = 0; ch < numChannels; ch++) {
            const oldData = audioBuffer.getChannelData(ch);
            const newData = newBuffer.getChannelData(ch);
            for (let i = 0; i < frameCount; i++) {
                newData[i] = oldData[startSample + i] || 0;
            }
        }

        return newBuffer;
    }

    /**
     * Compute simple features for a slice: RMS and crude spectral centroid index
     */
    computeSliceFeatures(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        if (!data || data.length === 0) return { rms: 0, centroid: 0 };

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);

        // crude centroid estimate
        let centroid = 0;
        let magSum = 0;
        const N = Math.min(256, data.length);
        for (let k = 1; k < N; k++) {
            const idx = Math.floor((k / N) * data.length);
            const mag = Math.abs(data[idx]) || 0;
            centroid += k * mag;
            magSum += mag;
        }
        const specCentroid = magSum > 0 ? (centroid / magSum) : 0;

        return { rms, centroid: specCentroid };
    }

    /**
     * Very simple heuristic classifier for a slice: returns 'kick'|'snare'|'hihat'|'clap' or null
     */
    classifySliceHeuristic(audioBuffer) {
        try {
            const data = audioBuffer.getChannelData(0);
            if (!data || data.length === 0) return null;

            // RMS energy
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / data.length);

            // Spectral centroid approx via simple DFT bins (very small)
            let centroid = 0;
            let magnitudeSum = 0;
            const N = Math.min(256, data.length);
            for (let k = 1; k < N; k++) {
                // crude magnitude estimate using real samples spaced
                const mag = Math.abs(data[Math.floor((k / N) * data.length)]) || 0;
                centroid += k * mag;
                magnitudeSum += mag;
            }
            const specCentroid = magnitudeSum > 0 ? (centroid / magnitudeSum) : 0;

            // Rules (tuned empirically):
            // - hihat: typically lower RMS and higher centroid
            // - kick: higher RMS and lower centroid
            // - snare: medium RMS and medium centroid
            // - clap: medium RMS and medium-high centroid
            // Make hi-hat detection stricter to avoid false positives
            if (rms > 0.03 && specCentroid < 50) return 'kick';
            if (rms > 0.012 && specCentroid >= 40 && specCentroid < 90) return 'snare';
            if (rms > 0.007 && specCentroid >= 100) return 'hihat';
            if (rms > 0.01 && specCentroid >= 60 && specCentroid < 140) return 'clap';

            return null;
        } catch (e) {
            console.warn('Heuristic classification failed', e);
            return null;
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
        // Use explicit mapping first
        predictions.forEach(prediction => {
            const className = prediction.className;
            const probability = prediction.probability;

            // Find mapped instrument for this class
            const mapped = Object.keys(this.classMapping).find(inst => {
                const cls = this.classMapping[inst];
                return cls && cls.toLowerCase() === className.toLowerCase();
            });

            if (mapped && probability >= this.modelThreshold) {
                classification[mapped] = Math.max(classification[mapped], probability);
                return;
            }

            // Fallback keyword matching
            const cname = className.toLowerCase();
            if (cname.includes('kick')) classification.kick = Math.max(classification.kick, probability);
            if (cname.includes('snare')) classification.snare = Math.max(classification.snare, probability);
            if (cname.includes('hat') || cname.includes('hihat')) classification.hihat = Math.max(classification.hihat, probability);
            if (cname.includes('clap')) classification.clap = Math.max(classification.clap, probability);
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