/**
 * API Client for SoundSketch.tech
 * Handles communication with backend APIs (Gemini, ElevenLabs)
 */

class APIClient {
    constructor() {
        // Use same origin as the page when possible so frontend and backend
        // calls go to the server that's actually serving the app. Falls back
        // to localhost:3001 if window.location is not available (e.g. tests).
        this.baseURL = (typeof window !== 'undefined' && window.location && window.location.origin)
            ? window.location.origin
            : 'http://localhost:3001';
        this.isInitialized = false;
    }

    /**
     * Initialize the API client
     */
    async init() {
        try {
            // Test backend connection
            const response = await fetch(`${this.baseURL}/health`);
            this.isInitialized = response.ok;
            
            if (this.isInitialized) {
                console.log('API client connected to backend');
            } else {
                console.warn('Backend not available, using mock responses');
            }
            
            return this.isInitialized;
            
        } catch (error) {
            console.warn('Backend not available, using mock responses:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Send DJ prompt to Gemini for beat modification
     */
    async processPromptWithGemini(prompt, currentPatterns) {
        try {
            if (this.isInitialized) {
                const response = await fetch(`${this.baseURL}/api/gemini/process-prompt`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        currentPatterns: currentPatterns
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const result = await response.json();
                return result;
            } else {
                // Use mock response
                return this.mockGeminiResponse(prompt, currentPatterns);
            }
            
        } catch (error) {
            console.error('Error processing prompt with Gemini:', error);
            return this.mockGeminiResponse(prompt, currentPatterns);
        }
    }

    /**
     * Generate narration using ElevenLabs
     */
    async generateNarration(text) {
        try {
            if (this.isInitialized) {
                const response = await fetch(`${this.baseURL}/api/elevenlabs/narrate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: text
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const audioBlob = await response.blob();
                return URL.createObjectURL(audioBlob);
            } else {
                // Use mock response
                return this.mockElevenLabsResponse(text);
            }
            
        } catch (error) {
            console.error('Error generating narration:', error);
            return this.mockElevenLabsResponse(text);
        }
    }

    /**
     * Generate producer tag using ElevenLabs (female voice)
     */
    async generateProducerTag(tag) {
        try {
            if (this.isInitialized) {
                const response = await fetch(`${this.baseURL}/api/elevenlabs/producer-tag`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        tag: tag,
                        voice: 'female' // Specify female voice
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const audioBlob = await response.blob();
                return URL.createObjectURL(audioBlob);
            } else {
                // Use mock response
                return this.mockElevenLabsResponse(tag);
            }

        } catch (error) {
            console.error('Error generating producer tag:', error);
            return this.mockElevenLabsResponse(tag);
        }
    }

    /**
     * Mock Gemini response for demo purposes
     */
    mockGeminiResponse(prompt, currentPatterns) {
        console.log('Using mock Gemini response for prompt:', prompt);
        
        const modifications = { ...currentPatterns };
        const response = {
            success: true,
            modifications: modifications,
            explanation: ''
        };

        // Process different types of prompts
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes('hi-hat') || promptLower.includes('hihat')) {
            // Add more hi-hats
            modifications.hihat = modifications.hihat.map((step, i) => 
                step || (i % 2 === 1 && Math.random() > 0.3)
            );
            response.explanation = "Added more hi-hat patterns on the off-beats for a busier rhythm.";
            
        } else if (promptLower.includes('bouncy') || promptLower.includes('swing')) {
            // Make it bouncy by shifting some beats
            modifications.kick = modifications.kick.map((step, i) => 
                step || (i === 6 || i === 14)
            );
            response.explanation = "Added syncopated kick patterns to make the beat more bouncy.";
            
        } else if (promptLower.includes('lo-fi') || promptLower.includes('lofi')) {
            // Reduce complexity, add swing
            modifications.hihat = modifications.hihat.map((step, i) => 
                i % 4 === 2 || i % 4 === 0
            );
            modifications.snare = [false, false, false, false, true, false, false, false,
                                  false, false, false, false, true, false, false, false];
            response.explanation = "Simplified the pattern and added lo-fi style spacing.";
            
        } else if (promptLower.includes('double') && promptLower.includes('tempo')) {
            // Double the tempo
            response.tempo = Math.min(currentPatterns.tempo || 120, 200) * 1.5;
            response.explanation = `Increased the tempo to ${Math.round(response.tempo)} BPM for higher energy.`;
            
        } else if (promptLower.includes('funk') || promptLower.includes('funky')) {
            // Add funky snare and clap patterns
            modifications.snare = [false, false, false, true, false, true, false, false,
                                  false, false, true, false, false, true, false, false];
            modifications.clap = [false, false, false, false, true, false, false, true,
                                 false, false, false, false, true, false, false, false];
            response.explanation = "Added syncopated snare and clap patterns for a funky groove.";
            
        } else {
            // Generic modification
            modifications.hihat = modifications.hihat.map((step, i) => 
                step || Math.random() > 0.7
            );
            response.explanation = "Applied general modifications to enhance the rhythm.";
        }

        return response;
    }

    /**
     * Mock ElevenLabs response for demo purposes
     */
    mockElevenLabsResponse(text) {
        console.log('Using mock ElevenLabs response for text:', text);
        
        // Return a placeholder audio URL (could be a pre-recorded sample)
        // For demo, we'll return null and show text instead
        return null;
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get API status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            baseURL: this.baseURL
        };
    }
}

// Export for use in other modules
window.APIClient = APIClient;