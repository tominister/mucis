# Teachable Machine Audio Models

This directory should contain your Teachable Machine audio classification models.

## Setup Instructions:

1. **Train your model at**: https://teachablemachine.withgoogle.com/train/audio
2. **Create 4 classes**:
   - Kick (bass drum sounds)
   - Snare (snare drum sounds)
   - Hi-Hat (high-frequency percussion)
   - Clap (hand clap sounds)

3. **Record training samples**:
   - Use beatboxing sounds for each category
   - Record at least 10-15 samples per class
   - Include variations (soft/loud, different tones)

4. **Export the model**:
   - Choose "TensorFlow.js" format
   - Download the model files
   - Place `model.json` and `metadata.json` in this directory
   - Create subdirectory: `tm-audio-model/`

5. **Model files should be**:
   ```
   models/
   ├── tm-audio-model/
   │   ├── model.json
   │   ├── metadata.json
   │   └── weights.bin (automatically downloaded)
   └── README.md (this file)
   ```

## Alternative: Use Mock Classification

If you don't have time to train a model, the app will automatically use mock classification that generates realistic-looking results for demo purposes.

## Tips for Training:

- **Kick**: Make "boom" or "bum" sounds
- **Snare**: Make "tss" or "pah" sounds  
- **Hi-Hat**: Make "tsk" or "ch" sounds
- **Clap**: Actually clap or make "pah" sounds

The model will work better with consistent, clear sounds during training.