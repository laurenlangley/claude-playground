import ddf.minim.analysis.*;
import ddf.minim.*;
import ddf.minim.spi.*;
import ddf.minim.effects.*;

Minim minim;
AudioInput in;
AudioOutput out;
FFT fft;
LowPassSP lowPass; // Filter for heartbeat frequencies
int w;
PImage fade;

int hVal;

float rWidth, rHeight;
boolean monitoring = false; // Toggle audio playback
boolean showWaveform = true; // Toggle waveform view
MonitorSignal monitorSignal;

// Heartbeat detection settings - MUCH higher for stethoscope
float inputGain = 100.0;     // Amplification for quiet sounds like heartbeats
float visualGain = 500.0;    // Visualization multiplier (much higher for heartbeats)
float monitorGain = 20.0;    // Playback volume amplification

// Peak detection for heartbeat
float peakThreshold = 0.02;  // Threshold for detecting heartbeat peaks
float lastPeakTime = 0;
float bpm = 0;               // Calculated beats per minute
ArrayList<Float> peakTimes = new ArrayList<Float>();

// AudioSignal that passes through input to output with amplification
class MonitorSignal implements AudioSignal {
  void generate(float[] samp) {
    for (int i = 0; i < samp.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        samp[i] = constrain(in.left.get(i) * monitorGain, -1.0, 1.0);
      } else {
        samp[i] = 0;
      }
    }
  }

  void generate(float[] sampL, float[] sampR) {
    for (int i = 0; i < sampL.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        float amplified = constrain(in.left.get(i) * monitorGain, -1.0, 1.0);
        sampL[i] = amplified;
        sampR[i] = amplified;
      } else {
        sampL[i] = 0;
        sampR[i] = 0;
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

  // Add low-pass filter to focus on heartbeat frequencies (20-200 Hz range)
  lowPass = new LowPassSP(200, in.sampleRate()); // Cut off above 200 Hz
  in.addEffect(lowPass);

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
  println("Low-pass filter enabled (20-200 Hz for heartbeat sounds)");
  println();
  println("CONTROLS:");
  println("  M - Toggle audio monitoring (playback)");
  println("  W - Toggle waveform view");
  println("  UP/DOWN - Adjust input gain (sensitivity)");
  println("  LEFT/RIGHT - Adjust visualization gain");
  println("  [ / ] - Adjust monitor volume");
  println("  + / - - Adjust peak detection threshold");
  println();
  println("Current settings:");
  println("  Input Gain: " + inputGain + "x (VERY HIGH for stethoscope)");
  println("  Visual Gain: " + visualGain + "x");
  println("  Monitor Gain: " + monitorGain + "x");
  println("  Low-pass filter: 200 Hz cutoff");
  println();
  println("TIP: For digital stethoscope, ensure it's powered on and volume is up!");
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

  // Peak detection for heartbeat
  if (amplifiedLevel > peakThreshold && millis() - lastPeakTime > 300) { // At least 300ms between peaks (200 BPM max)
    lastPeakTime = millis();
    peakTimes.add(millis() / 1000.0); // Store time in seconds

    // Calculate BPM from last 10 peaks
    if (peakTimes.size() > 10) {
      peakTimes.remove(0); // Keep only last 10
    }
    if (peakTimes.size() >= 2) {
      float duration = peakTimes.get(peakTimes.size()-1) - peakTimes.get(0);
      float avgInterval = duration / (peakTimes.size() - 1);
      bpm = 60.0 / avgInterval;
      println("♥ HEARTBEAT DETECTED! BPM: " + nf(bpm, 0, 1));
    }
  }

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
  else if (key == '+' || key == '=') {
    // Increase peak threshold
    peakThreshold += 0.005;
    peakThreshold = constrain(peakThreshold, 0.001, 1.0);
    println("Peak Threshold: " + peakThreshold);
  }
  else if (key == '-' || key == '_') {
    // Decrease peak threshold
    peakThreshold -= 0.005;
    peakThreshold = constrain(peakThreshold, 0.001, 1.0);
    println("Peak Threshold: " + peakThreshold);
  }
  else if (key == CODED) {
    if (keyCode == UP) {
      // Increase input gain
      inputGain += 10.0;
      inputGain = constrain(inputGain, 1.0, 1000.0);
      println("Input Gain: " + inputGain + "x");
    }
    else if (keyCode == DOWN) {
      // Decrease input gain
      inputGain -= 10.0;
      inputGain = constrain(inputGain, 1.0, 1000.0);
      println("Input Gain: " + inputGain + "x");
    }
    else if (keyCode == RIGHT) {
      // Increase visual gain
      visualGain += 25.0;
      visualGain = constrain(visualGain, 1.0, 2000.0);
      println("Visual Gain: " + visualGain + "x");
    }
    else if (keyCode == LEFT) {
      // Decrease visual gain
      visualGain -= 25.0;
      visualGain = constrain(visualGain, 1.0, 2000.0);
      println("Visual Gain: " + visualGain + "x");
    }
  }
  else if (key == '[') {
    // Decrease monitor volume
    monitorGain -= 2.0;
    monitorGain = constrain(monitorGain, 1.0, 100.0);
    println("Monitor Volume: " + monitorGain + "x");
  }
  else if (key == ']') {
    // Increase monitor volume
    monitorGain += 2.0;
    monitorGain = constrain(monitorGain, 1.0, 100.0);
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
