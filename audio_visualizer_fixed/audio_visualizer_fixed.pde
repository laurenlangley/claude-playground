import ddf.minim.analysis.*;
import ddf.minim.*;
import ddf.minim.spi.*;
import ddf.minim.effects.*;

Minim minim;
AudioInput in;
AudioOutput out;
FFT fft;
LowPassSP lowPass;   // Filter for heartbeat frequencies
HighPassSP highPass; // Filter to remove rumble/DC offset
int w;
PImage fade;

int hVal;

float rWidth, rHeight;
boolean monitoring = false;     // Toggle audio playback
boolean showWaveform = true;    // Toggle waveform view
boolean filterEnabled = true;   // Toggle low-pass filter (can cause crackling)
MonitorSignal monitorSignal;

// Heartbeat detection settings - Reduced defaults for better control
float inputGain = 20.0;      // Start lower, can adjust up
float visualGain = 100.0;    // Start lower, can adjust up
float monitorGain = 2.0;     // VERY low to minimize noise

// Peak detection for heartbeat with improved algorithm
float peakThreshold = 0.05;  // Threshold for detecting heartbeat peaks
float lastPeakTime = 0;
float lastPeakValue = 0;
float bpm = 0;               // Calculated beats per minute
float smoothedBPM = 0;       // Smoothed BPM for stability
ArrayList<Float> peakTimes = new ArrayList<Float>();
ArrayList<Float> recentBPMs = new ArrayList<Float>();

// Better smoothing for audio to eliminate crackling
float lastOutputSample = 0;
float smoothingFactor = 0.3; // Lower = smoother but more latency

// AudioSignal with aggressive noise reduction
class MonitorSignal implements AudioSignal {
  void generate(float[] samp) {
    for (int i = 0; i < samp.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        // Get input sample
        float sample = in.left.get(i) * monitorGain;

        // Exponential smoothing to reduce crackling
        lastOutputSample = lastOutputSample * (1.0 - smoothingFactor) + sample * smoothingFactor;

        // Soft clipping
        float smoothed = lastOutputSample / (1.0 + abs(lastOutputSample));
        samp[i] = constrain(smoothed, -1.0, 1.0);
      } else {
        samp[i] = 0;
        lastOutputSample = 0;
      }
    }
  }

  void generate(float[] sampL, float[] sampR) {
    for (int i = 0; i < sampL.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        // Get input sample
        float sample = in.left.get(i) * monitorGain;

        // Exponential smoothing to reduce crackling
        lastOutputSample = lastOutputSample * (1.0 - smoothingFactor) + sample * smoothingFactor;

        // Soft clipping
        float smoothed = lastOutputSample / (1.0 + abs(lastOutputSample));
        float amplified = constrain(smoothed, -1.0, 1.0);
        sampL[i] = amplified;
        sampR[i] = amplified;
      } else {
        sampL[i] = 0;
        sampR[i] = 0;
        lastOutputSample = 0;
      }
    }
  }
}

void setup()
{
  size(640, 480, P3D);

  minim = new Minim(this);

  // Try to get audio input - use MONO for better compatibility (especially on macOS)
  in = minim.getLineIn(Minim.MONO, 1024); // Larger buffer for better low-frequency detection

  // Add high-pass filter to remove rumble and DC offset (reduces crackling)
  highPass = new HighPassSP(20, in.sampleRate()); // Remove below 20 Hz
  in.addEffect(highPass);

  // Add low-pass filter to focus on heartbeat frequencies (can be toggled with F key)
  lowPass = new LowPassSP(200, in.sampleRate()); // Cut off above 200 Hz
  if (filterEnabled) {
    in.addEffect(lowPass);
  }

  // Get audio output for monitoring
  out = minim.getLineOut(Minim.MONO, 1024);

  // Create and add the monitoring signal
  monitorSignal = new MonitorSignal();
  out.addSignal(monitorSignal);

  // Debug: Print audio input info
  println("Audio input created");
  println("Buffer size: " + in.bufferSize());
  println("Sample rate: " + in.sampleRate());
  println();
  println("=== DIGITAL STETHOSCOPE MODE ===");
  println("Optimized for detecting heartbeats from digital stethoscopes");
  println("High-pass filter: 20 Hz (removes rumble/DC offset)");
  println("Low-pass filter: " + (filterEnabled ? "ENABLED (200 Hz)" : "DISABLED"));
  println("Exponential smoothing: " + (smoothingFactor * 100) + "% (reduces crackling)");
  println();
  println("CONTROLS:");
  println("  M - Toggle audio monitoring (playback)");
  println("  W - Toggle waveform view");
  println("  F - Toggle low-pass filter (try if crackling persists)");
  println("  S - Increase smoothing (reduces noise, adds latency)");
  println("  SHIFT+S - Decrease smoothing (less latency, more noise)");
  println("  UP/DOWN - Adjust input gain +/- 2x (fine control)");
  println("  SHIFT+UP/DOWN - Adjust input gain +/- 10x (coarse control)");
  println("  LEFT/RIGHT - Adjust visualization gain +/- 10x");
  println("  [ / ] - Adjust monitor volume +/- 1x");
  println("  + / - - Adjust peak detection threshold");
  println("  R - Reset all gains to defaults");
  println();
  println("Current settings (OPTIMIZED for clean audio):");
  println("  Input Gain: " + inputGain + "x");
  println("  Visual Gain: " + visualGain + "x");
  println("  Monitor Gain: " + monitorGain + "x (VERY LOW to reduce noise)");
  println("  Smoothing: " + nf(smoothingFactor, 0, 2));
  println("  Peak Threshold: " + peakThreshold);
  println();
  println("TIP: If crackling persists, try:");
  println("  1. Press F to disable low-pass filter");
  println("  2. Press S to increase smoothing");
  println("  3. Use [ to lower monitor volume");
  println();

  fft = new FFT(in.bufferSize(), in.sampleRate());
  fft.logAverages(22, 3); // Focus on lower frequencies

  println("FFT avg size: " + fft.avgSize());

  stroke(255);
  w = width/fft.avgSize();
  strokeWeight(w);
  strokeCap(SQUARE);

  println("Bar width: " + w);

  background(0);
  fade = get(0, 0, width, height);

  rWidth = width * 0.99;
  rHeight = height * 0.99;
  hVal = 0;
}

void draw()
{
  background(0);

  // Get amplified audio level
  float rawLevel = in.mix.level();
  float amplifiedLevel = rawLevel * inputGain;

  // Improved peak detection for heartbeat
  float currentTime = millis();

  // Detect peak: level above threshold AND higher than recent peaks AND reasonable timing
  boolean isPeak = amplifiedLevel > peakThreshold &&
                   amplifiedLevel > lastPeakValue * 0.8; // Must be significant peak

  // Heartbeat timing constraints (30-200 BPM range)
  float minInterval = 300;  // 200 BPM max
  float maxInterval = 2000; // 30 BPM min
  float timeSinceLastPeak = currentTime - lastPeakTime;

  if (isPeak && timeSinceLastPeak > minInterval) {
    // Valid peak detected
    if (timeSinceLastPeak < maxInterval) {
      // Calculate instantaneous BPM from this interval
      float instantBPM = 60000.0 / timeSinceLastPeak;

      // Only accept BPM in reasonable range
      if (instantBPM >= 30 && instantBPM <= 200) {
        recentBPMs.add(instantBPM);

        // Keep only last 5 BPM readings for smoothing
        if (recentBPMs.size() > 5) {
          recentBPMs.remove(0);
        }

        // Calculate smoothed BPM (average of recent readings)
        float sum = 0;
        for (float b : recentBPMs) {
          sum += b;
        }
        smoothedBPM = sum / recentBPMs.size();
        bpm = smoothedBPM;

        println("♥ HEARTBEAT! Instant: " + nf(instantBPM, 0, 1) + " | Smoothed: " + nf(smoothedBPM, 0, 1) + " BPM");
      }
    }

    lastPeakTime = currentTime;
    lastPeakValue = amplifiedLevel;
  }

  // Decay last peak value over time
  lastPeakValue *= 0.95;

  // Debug: Print audio level every 30 frames
  if (frameCount % 30 == 0) {
    println("Raw: " + nf(rawLevel, 0, 6) + " | Amp: " + nf(amplifiedLevel, 0, 4) + " | Threshold: " + nf(peakThreshold, 0, 3));
  }

  if (showWaveform) {
    // Draw waveform (raw signal over time)
    stroke(0, 255, 0);
    strokeWeight(2);
    noFill();
    beginShape();
    for (int i = 0; i < in.bufferSize(); i++) {
      float x = map(i, 0, in.bufferSize(), 0, width);
      float y = height/2 + in.left.get(i) * inputGain * 100;
      vertex(x, y);
    }
    endShape();

    // Draw centerline
    stroke(100);
    strokeWeight(1);
    line(0, height/2, width, height/2);

    // Draw threshold line
    stroke(255, 0, 0);
    float thresholdY = height/2 - (peakThreshold / inputGain) * 100 * inputGain;
    line(0, thresholdY, width, thresholdY);

  } else {
    // Draw frequency spectrum with fade effect
    tint(255, 255, 255, 254);
    image(fade, (width - rWidth) / 2, (height - rHeight) / 2, rWidth, rHeight);
    noTint();

    // Perform FFT analysis
    fft.forward(in.mix);

    // Draw frequency bars with color and amplification
    colorMode(HSB);
    stroke(hVal, 255, 255);
    colorMode(RGB);
    strokeWeight(w);

    for(int i = 0; i < fft.avgSize(); i++)
    {
      // Apply visual gain for maximum sensitivity
      float barHeight = fft.getAvg(i) * visualGain;
      line((i * w) + (w / 2), height, (i * w) + (w / 2), height - barHeight);
    }

    // Capture current frame for fade effect
    fade = get(0, 0, width, height);
  }

  // REMOVED: This was drawing white lines over the colored ones!
  // This is why you'd only see white if anything appeared
  /*
  stroke(255);
  for(int i = 0; i < fft.avgSize(); i++)
  {
    line((i * w) + (w / 2), height, (i * w) + (w / 2), height - fft.getAvg(i) * 4);
  }
  */

  // Draw status indicators and controls info
  noStroke();

  // Green dot: sketch is running
  fill(0, 255, 0);
  ellipse(10, 10, 10, 10);

  // Monitoring indicator (red = off, green = on)
  if (monitoring) {
    fill(0, 255, 0);
  } else {
    fill(255, 0, 0);
  }
  ellipse(30, 10, 10, 10);

  // Display settings and controls
  fill(255);
  textSize(11);
  int yPos = 15;
  text("Monitor: " + (monitoring ? "ON" : "OFF") + " | View: " + (showWaveform ? "WAVEFORM" : "SPECTRUM"), 45, yPos);
  yPos += 15;
  text("Input Gain: " + nf(inputGain, 0, 1) + "x (UP/DOWN)", 10, yPos);
  yPos += 15;
  text("Visual Gain: " + nf(visualGain, 0, 1) + "x (LEFT/RIGHT)", 10, yPos);
  yPos += 15;
  text("Peak Threshold: " + nf(peakThreshold, 0, 3) + " (+/-)", 10, yPos);

  // BPM Display (large and prominent)
  if (bpm > 0) {
    textSize(32);
    fill(255, 0, 0);
    text("♥ " + nf(bpm, 0, 0) + " BPM", width - 150, 40);

    // Flash on beat
    if (millis() - lastPeakTime < 100) {
      fill(255, 0, 0, 100);
      ellipse(width - 30, 25, 40, 40);
    }
  }

  // Draw real-time level meter
  float meterY = height - 40;
  float meterWidth = width - 20;

  // Background
  stroke(100);
  noFill();
  rect(10, meterY, meterWidth, 20);

  // Level bar (amplified)
  noStroke();
  if (amplifiedLevel > peakThreshold) {
    fill(255, 0, 0); // Red when above threshold
  } else {
    fill(0, 255, 0); // Green normally
  }
  float levelWidth = constrain(amplifiedLevel * meterWidth, 0, meterWidth);
  rect(10, meterY, levelWidth, 20);

  // Threshold marker
  fill(255, 255, 0);
  float thresholdX = 10 + peakThreshold * meterWidth;
  triangle(thresholdX, meterY - 5, thresholdX - 5, meterY, thresholdX + 5, meterY);

  // Level text
  fill(255);
  textSize(10);
  text("Level: " + nf(amplifiedLevel, 0, 4) + " (Threshold: " + nf(peakThreshold, 0, 3) + ")", 10, meterY - 5);

  // Update hue value
  hVal += 2;
  if(hVal > 255)
  {
    hVal = 0;
  }
}

// Keyboard controls for gain adjustment and mode switching
void keyPressed() {
  if (key == 'm' || key == 'M') {
    monitoring = !monitoring;
    println("Audio monitoring: " + (monitoring ? "ON" : "OFF"));
    if (monitoring) {
      println("WARNING: Feedback may occur if using speakers!");
    }
  }
  else if (key == 'w' || key == 'W') {
    showWaveform = !showWaveform;
    println("View mode: " + (showWaveform ? "WAVEFORM (better for heartbeat)" : "SPECTRUM"));
  }
  else if (key == 'f' || key == 'F') {
    // Toggle low-pass filter
    filterEnabled = !filterEnabled;
    if (filterEnabled) {
      in.addEffect(lowPass);
      println("Low-pass filter: ENABLED (200 Hz cutoff)");
    } else {
      in.disableEffect(lowPass);
      println("Low-pass filter: DISABLED (may help if crackling persists)");
    }
  }
  else if (key == 's' || key == 'S') {
    // Check for SHIFT key
    boolean isShift = (keyEvent != null && keyEvent.isShiftDown());
    if (isShift) {
      // Decrease smoothing (less latency, more noise)
      smoothingFactor -= 0.05;
      smoothingFactor = constrain(smoothingFactor, 0.05, 0.95);
      println("Smoothing: " + nf(smoothingFactor, 0, 2) + " (decreased - less latency, more responsive)");
    } else {
      // Increase smoothing (reduces noise/crackling)
      smoothingFactor += 0.05;
      smoothingFactor = constrain(smoothingFactor, 0.05, 0.95);
      println("Smoothing: " + nf(smoothingFactor, 0, 2) + " (increased - cleaner but more latency)");
    }
  }
  else if (key == 'r' || key == 'R') {
    // Reset all gains to defaults
    inputGain = 20.0;
    visualGain = 100.0;
    monitorGain = 2.0;
    peakThreshold = 0.05;
    smoothingFactor = 0.3;
    filterEnabled = true;
    println("=== RESET TO DEFAULTS ===");
    println("Input Gain: " + inputGain + "x");
    println("Visual Gain: " + visualGain + "x");
    println("Monitor Gain: " + monitorGain + "x");
    println("Smoothing: " + smoothingFactor);
    println("Peak Threshold: " + peakThreshold);
  }
  else if (key == '+' || key == '=') {
    // Increase peak threshold
    peakThreshold += 0.01;
    peakThreshold = constrain(peakThreshold, 0.001, 1.0);
    println("Peak Threshold: " + peakThreshold);
  }
  else if (key == '-' || key == '_') {
    // Decrease peak threshold
    peakThreshold -= 0.01;
    peakThreshold = constrain(peakThreshold, 0.001, 1.0);
    println("Peak Threshold: " + peakThreshold);
  }
  else if (key == CODED) {
    // Check for SHIFT key for coarse adjustments
    boolean isShift = (keyEvent != null && keyEvent.isShiftDown());

    if (keyCode == UP) {
      // Increase input gain (fine or coarse)
      float increment = isShift ? 10.0 : 2.0;
      inputGain += increment;
      inputGain = constrain(inputGain, 1.0, 1000.0);
      println("Input Gain: " + inputGain + "x " + (isShift ? "(coarse)" : "(fine)"));
    }
    else if (keyCode == DOWN) {
      // Decrease input gain (fine or coarse)
      float decrement = isShift ? 10.0 : 2.0;
      inputGain -= decrement;
      inputGain = constrain(inputGain, 1.0, 1000.0);
      println("Input Gain: " + inputGain + "x " + (isShift ? "(coarse)" : "(fine)"));
    }
    else if (keyCode == RIGHT) {
      // Increase visual gain
      visualGain += 10.0;
      visualGain = constrain(visualGain, 1.0, 2000.0);
      println("Visual Gain: " + visualGain + "x");
    }
    else if (keyCode == LEFT) {
      // Decrease visual gain
      visualGain -= 10.0;
      visualGain = constrain(visualGain, 1.0, 2000.0);
      println("Visual Gain: " + visualGain + "x");
    }
  }
  else if (key == '[') {
    // Decrease monitor volume
    monitorGain -= 1.0;
    monitorGain = constrain(monitorGain, 1.0, 50.0);
    println("Monitor Volume: " + monitorGain + "x");
  }
  else if (key == ']') {
    // Increase monitor volume
    monitorGain += 1.0;
    monitorGain = constrain(monitorGain, 1.0, 50.0);
    println("Monitor Volume: " + monitorGain + "x");
  }
}

// Clean up audio on exit
void stop()
{
  in.close();
  out.close();
  minim.stop();
  super.stop();
}
