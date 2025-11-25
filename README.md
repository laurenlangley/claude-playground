# claude-playground

An experimental project to try out Claude Code.

This repository is used for testing and experimenting with Claude Code features.

## Processing Audio Visualizer Debug

### Processing Sketch Folder Structure

**IMPORTANT:** Each Processing sketch must be in its own folder with a matching name:
```
test_minim/
  └── test_minim.pde
audio_visualizer/
  └── audio_visualizer.pde
audio_visualizer_fixed/
  └── audio_visualizer_fixed.pde
```

To open a sketch in Processing:
- **File → Open** and navigate to the sketch folder
- Or double-click the `.pde` file and Processing will open it correctly

### Prerequisites: Install Minim Library

**IMPORTANT:** Before running any of these sketches, you must install the Minim audio library in Processing.

#### Installation Steps:
1. Open Processing IDE
2. Go to **Sketch → Import Library → Add Library...**
3. Search for **"Minim"**
4. Click on **Minim by Damien Di Fede**
5. Click **Install**

#### Verify Installation:
- Run `test_minim.pde` to verify Minim is working
- Or check: **Sketch → Import Library** - you should see Minim listed

#### Common Error Without Minim:
```
The package "ddf.minim" does not exist. You might be missing a library.
```

If you see this error, Minim is not installed.

### Issues Found

#### 1. **Double Drawing Bug** (MAJOR)
The original code draws the frequency bars twice:
- First with colored stroke (HSB mode)
- Then immediately with white stroke at the EXACT same positions

This means the colored visualization is completely hidden by white lines. This is likely why you're not seeing any color variation.

#### 2. **Audio Input Detection**
The code may fail to detect audio for several reasons:

**Permission Issues:**
- **macOS**: Processing needs microphone permission (System Preferences > Security & Privacy > Microphone)
- **Linux**: Check PulseAudio/ALSA settings
- **Windows**: Usually works by default

**Audio Device Issues:**
- No microphone connected
- Wrong default input device selected
- Microphone muted or volume too low

#### 3. **Low Audio Levels**
Even if audio is detected, very quiet input will produce bars too small to see (multiplied by only 4).

### How to Debug

**Step 1: Run the Fixed Version**

Use `audio_visualizer_fixed.pde` which includes:
- Debug console output showing audio levels
- Removed the duplicate white line drawing
- Green indicator dot to confirm sketch is running
- Proper cleanup on exit

**Step 2: Check Console Output**

When you run it, the console should show:
```
Audio input created
Buffer size: 512
Sample rate: 44100.0
FFT avg size: [number]
Bar width: [number]
```

Every second you should see:
```
Audio level: [number]
Max FFT average: [number]
```

If audio level stays at 0.0, your microphone isn't being detected.

### ⚠️ Audio Level is 0.0? (Microphone Not Detected)

**If you see audio level staying at 0.0, run the diagnostics tool:**

1. Open **`audio_diagnostics/audio_diagnostics.pde`**
2. Check the console output for available audio devices
3. Follow the on-screen troubleshooting steps

**See [AUDIO_TROUBLESHOOTING.md](AUDIO_TROUBLESHOOTING.md) for detailed platform-specific fixes**

Common quick fixes:
- **macOS**: Grant microphone permission in System Preferences → Security & Privacy → Microphone
- **Linux**: Ensure you're in the `audio` group and PulseAudio is configured
- **Windows**: Check Sound settings → Recording → Enable microphone
- **All platforms**: Verify microphone works in other apps first

**Step 3: Verify Audio Input**
1. Check you see the green dot (top-left corner) - confirms sketch is running
2. Make noise near your microphone
3. Watch the console - audio level should change from 0.0
4. Look for colored bars - they should appear from the bottom

**Step 4: Increase Sensitivity (if needed)**

If you see small numbers in the console but no bars, increase the multiplier in line 50:
```processing
float barHeight = fft.getAvg(i) * 20;  // Try 10, 20, or higher instead of 4
```

### Sketches
- **`audio_diagnostics/`** - **START HERE if audio level is 0.0** - Comprehensive audio troubleshooting tool
- **`test_minim/`** - Test sketch to verify Minim library is installed
- **`audio_visualizer/`** - Original code with issues
- **`audio_visualizer_fixed/`** - Fixed version with debugging (use this one!)

### Documentation
- **`AUDIO_TROUBLESHOOTING.md`** - Detailed platform-specific audio troubleshooting guide
