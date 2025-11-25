# Audio Input Troubleshooting Guide

## Problem: Audio Level is 0.0 (Microphone Not Detected)

If you see "Audio level: 0.0" in the console, your microphone is not being detected by Processing/Minim.

### Step 1: Run Diagnostics

Run `audio_diagnostics/audio_diagnostics.pde` first. This will:
- List all available audio devices
- Show detailed error messages
- Display real-time audio levels
- Provide platform-specific fixes

### Step 2: Check System Settings

#### macOS
1. **Grant Microphone Permission:**
   - System Preferences → Security & Privacy → Privacy → Microphone
   - Make sure Processing is checked/enabled
   - You may need to restart Processing after granting permission

2. **Check Input Device:**
   - System Preferences → Sound → Input
   - Select your microphone
   - Verify the input level meter moves when you speak

3. **Test in Terminal:**
   ```bash
   # List audio devices
   system_profiler SPAudioDataType
   ```

#### Linux
1. **Check PulseAudio:**
   ```bash
   # List audio sources
   pactl list sources short

   # Test recording
   arecord -l
   ```

2. **Grant Permissions:**
   ```bash
   # Make sure your user is in the audio group
   groups | grep audio

   # Add to audio group if needed
   sudo usermod -a -G audio $USER
   ```

3. **Test Microphone:**
   ```bash
   # Record test (Ctrl+C to stop)
   arecord -f cd test.wav

   # Play back
   aplay test.wav
   ```

#### Windows
1. **Check Recording Devices:**
   - Right-click speaker icon → Sounds → Recording tab
   - Make sure microphone is enabled and set as default
   - Speak and check if the level meter moves

2. **Privacy Settings:**
   - Settings → Privacy → Microphone
   - Enable "Allow apps to access your microphone"

3. **Run as Administrator:**
   - Right-click Processing → Run as administrator

### Step 3: Try Different Configurations

If basic setup doesn't work, try these alternatives:

#### Alternative 1: Use STEREO instead of MONO
```processing
in = minim.getLineIn(Minim.STEREO, 512);
```

#### Alternative 2: Try larger buffer
```processing
in = minim.getLineIn(Minim.MONO, 1024);
```

#### Alternative 3: Specify different sample rate
```processing
in = minim.getLineIn(Minim.MONO, 512, 44100.0);
```

### Step 4: Test with Minimal Code

If diagnostics fail, try this absolute minimum test:

```processing
import ddf.minim.*;

Minim minim;
AudioInput in;

void setup() {
  minim = new Minim(this);

  // This will print errors if it fails
  in = minim.getLineIn();

  println("Audio working!");
}

void draw() {
  println(in.mix.level());
}
```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "No line matching interface" | No microphone detected by system |
| Permission denied | Grant microphone access in system settings |
| Level always 0.0 | Wrong input device selected, or microphone muted |
| "Could not get an audio input" | ALSA/PulseAudio misconfiguration (Linux) |
| Works in other apps but not Processing | Restart Processing, check permissions |

### Platform-Specific Known Issues

**macOS Catalina and later:**
- Requires explicit microphone permission
- Processing must be in the allowed apps list
- May need to grant permission to Java as well

**Linux with PulseAudio:**
- May need to use `pasuspender` to run Processing
- ALSA/PulseAudio conflicts can cause issues

**Windows with Bluetooth headset:**
- May need to select specific audio device
- Bluetooth delay can cause issues

### Still Not Working?

1. **Test your microphone in another application** (Audacity, Voice Recorder, etc.)
2. **Check Processing console** for detailed error messages
3. **Try a different microphone** if available
4. **Update audio drivers** (especially on Windows)
5. **Try an older/newer version of Processing**

### Alternative: Use Sound File Instead

For testing the visualizer without fixing audio input:

```processing
import ddf.minim.*;

Minim minim;
AudioPlayer player;
FFT fft;

void setup() {
  minim = new Minim(this);

  // Load a sound file instead of using microphone
  player = minim.loadFile("song.mp3");
  player.play();

  fft = new FFT(player.bufferSize(), player.sampleRate());
}

void draw() {
  fft.forward(player.mix);
  // ... rest of visualization code
}
```

This lets you test the visualization while troubleshooting audio input separately.
