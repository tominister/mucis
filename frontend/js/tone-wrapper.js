/**
 * Tone.js Wrapper for SoundSketch.tech
 * Defers Tone.js loading until after user interaction
 */

class ToneWrapper {
    constructor() {
        this.toneLoaded = false;
        this.tone = null;
    }

    async loadTone() {
        if (this.toneLoaded) {
            return this.tone;
        }

        // Tone.js is already loaded globally, just start the context
        await Tone.start();
        this.tone = Tone;
        this.toneLoaded = true;
        
        console.log('✅ Tone.js audio context activated');
        return this.tone;
    }

    get isLoaded() {
        return this.toneLoaded;
    }

    get context() {
        return this.tone ? this.tone.context : null;
    }
}

// Export global wrapper
window.ToneWrapper = new ToneWrapper();