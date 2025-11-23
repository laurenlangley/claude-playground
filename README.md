# claude-playground

An experimental project to try out Claude Code.

This repository is used for testing and experimenting with Claude Code features.

## Audio Visualization App

An interactive web-based audio visualization application built with p5.js that transforms real-time audio input into dynamic FFT (Fast Fourier Transform) spectrum visualizations.

### Features

- **Real-time Audio Processing**: Captures audio from hardware devices (microphone, line-in, or specialized devices like electronically converted stethoscopes)
- **FFT Spectrum Visualization**: Displays frequency spectrum as animated vertical bars
- **Color Cycling**: Rainbow color effect that cycles through the HSB color spectrum
- **Fade/Trail Effect**: Creates smooth motion trails by scaling and fading previous frames
- **Hardware Device Support**: Compatible with any audio input device recognized by your browser

### Technical Details

This project converts Processing code (using Minim library) to p5.js (using p5.sound library):

- **Audio Input**: Uses `p5.AudioIn()` to capture audio from any connected input device
- **FFT Analysis**: Uses `p5.FFT()` with 512 bins and logarithmic frequency averaging
- **Visualization**: 63 frequency bands displayed as vertical bars with:
  - Colored bars (HSB hue cycling)
  - White bars overlaid on top
  - 99% scaled fade effect for smooth trails
  - SQUARE stroke caps for rectangular bars

### Setup Instructions

1. **Open the application**:
   - Simply open `index.html` in a modern web browser
   - Or serve via local web server (required for some browsers)

2. **Configure audio input**:
   - Connect your audio device (microphone, line-in, stethoscope, etc.)
   - Ensure it's selected as the default input in your system settings
   - Or use browser permissions to select the specific device

3. **Start visualization**:
   - Click the "Click to Start Audio Visualization" button
   - Grant microphone/audio permissions when prompted by the browser
   - The visualization will start immediately

### Using with Hardware Audio Devices

To use with specialized devices like an electronically converted stethoscope:

1. Connect the device to your computer's audio input (line-in or USB audio interface)
2. Set the device as the default recording device in your system audio settings
3. Open the app and grant audio permissions
4. The visualization will display the audio signal from your hardware device

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require HTTPS for audio access)

**Note**: Modern browsers require user interaction before accessing audio devices. This is why the "Start" button is necessary.

### Project Structure

```
/
├── index.html      # Main HTML file with p5.js library imports
├── sketch.js       # p5.js sketch with audio visualization code
└── README.md       # This file
```

### Customization

You can modify the following parameters in `sketch.js`:

- **Canvas size**: Change `createCanvas(640, 480)` to your desired dimensions
- **Number of frequency bands**: Modify `numBands` variable (default: 63)
- **Color cycling speed**: Adjust `hVal += 2` (higher = faster color changes)
- **Amplitude scaling**: Change the multiplier in `height - h * 0.8`
- **Fade effect intensity**: Adjust `tint(255, 255, 255, 254)` (lower alpha = more fade)
- **Fade scaling**: Modify `rWidth` and `rHeight` (default: 99% = 0.99)

### Future Enhancements

Planned features for future development:

- Multiple visualization modes (waveform, circular, 3D)
- User controls for adjusting sensitivity and visual parameters
- Recording and playback functionality
- Audio filters and effects
- Frequency range selection
- Custom color schemes

### License

This is an experimental project for testing purposes.
