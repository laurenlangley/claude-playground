import ddf.minim.analysis.*;
import ddf.minim.*;
import ddf.minim.spi.*;

Minim minim;
AudioInput in;
AudioOutput out;
FFT fft;
int w;
PImage fade;

int hVal;

float rWidth, rHeight;
boolean monitoring = false; // Toggle audio playback
MonitorSignal monitorSignal;

// Heartbeat detection settings
float inputGain = 50.0;      // Amplification for quiet sounds like heartbeats
float visualGain = 200.0;    // Visualization multiplier (much higher for heartbeats)
float monitorGain = 10.0;    // Playback volume amplification

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
  in = minim.getLineIn(Minim.MONO, 512);

  // Get audio output for monitoring
  out = minim.getLineOut(Minim.MONO, 512);

  // Create and add the monitoring signal
  monitorSignal = new MonitorSignal();
  out.addSignal(monitorSignal);

  // Debug: Print audio input info
  println("Audio input created");
  println("Buffer size: " + in.bufferSize());
  println("Sample rate: " + in.sampleRate());
  println();
  println("=== HEARTBEAT DETECTION MODE ===");
  println("Optimized for detecting quiet sounds like heartbeats");
  println();
  println("CONTROLS:");
  println("  M - Toggle audio monitoring (playback)");
  println("  UP/DOWN - Adjust input gain (sensitivity)");
  println("  LEFT/RIGHT - Adjust visualization gain");
  println("  [ / ] - Adjust monitor volume");
  println();
  println("Current settings:");
  println("  Input Gain: " + inputGain + "x");
  println("  Visual Gain: " + visualGain + "x");
  println("  Monitor Gain: " + monitorGain + "x");
  println();
  println("TIP: Place microphone directly on chest/wrist for best results");
  println("WARNING: If using speakers, feedback may occur!");
  println();

  fft = new FFT(in.bufferSize(), in.sampleRate());
  fft.logAverages(60, 7);

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

  // Apply fade effect
  tint(255, 255, 255, 254);
  image(fade, (width - rWidth) / 2, (height - rHeight) / 2, rWidth, rHeight);
  noTint();

  // Perform FFT analysis
  fft.forward(in.mix);

  // Get amplified audio level
  float rawLevel = in.mix.level();
  float amplifiedLevel = rawLevel * inputGain;

  // Debug: Print audio level every 30 frames
  if (frameCount % 30 == 0) {
    println("Raw level: " + nf(rawLevel, 0, 6) + " | Amplified: " + nf(amplifiedLevel, 0, 4));
    float maxAvg = 0;
    for(int i = 0; i < fft.avgSize(); i++) {
      maxAvg = max(maxAvg, fft.getAvg(i));
    }
    println("Max FFT average: " + nf(maxAvg, 0, 4) + " | Visualized: " + nf(maxAvg * visualGain, 0, 2));
  }

  // Draw frequency bars with color and amplification
  colorMode(HSB);
  stroke(hVal, 255, 255);
  colorMode(RGB);

  for(int i = 0; i < fft.avgSize(); i++)
  {
    // Apply both input gain and visual gain for maximum sensitivity
    float barHeight = fft.getAvg(i) * visualGain;
    line((i * w) + (w / 2), height, (i * w) + (w / 2), height - barHeight);
  }

  // Capture current frame for fade effect
  fade = get(0, 0, width, height);

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
  text("Monitor: " + (monitoring ? "ON" : "OFF"), 45, yPos);
  yPos += 15;
  text("Input Gain: " + nf(inputGain, 0, 1) + "x (UP/DOWN)", 10, yPos);
  yPos += 15;
  text("Visual Gain: " + nf(visualGain, 0, 1) + "x (LEFT/RIGHT)", 10, yPos);
  yPos += 15;
  text("Monitor Vol: " + nf(monitorGain, 0, 1) + "x ([/])", 10, yPos);

  // Draw real-time level meter
  float meterY = height - 40;
  float meterWidth = width - 20;

  // Background
  stroke(100);
  noFill();
  rect(10, meterY, meterWidth, 20);

  // Level bar (amplified)
  noStroke();
  fill(0, 255, 0);
  float levelWidth = constrain(amplifiedLevel * meterWidth, 0, meterWidth);
  rect(10, meterY, levelWidth, 20);

  // Level text
  fill(255);
  textSize(10);
  text("Level: " + nf(amplifiedLevel, 0, 4), 10, meterY - 5);

  // Update hue value
  hVal += 2;
  if(hVal > 255)
  {
    hVal = 0;
  }
}

// Keyboard controls for gain adjustment
void keyPressed() {
  if (key == 'm' || key == 'M') {
    monitoring = !monitoring;
    println("Audio monitoring: " + (monitoring ? "ON" : "OFF"));
    if (monitoring) {
      println("WARNING: Feedback may occur if using speakers!");
    }
  }
  else if (key == CODED) {
    if (keyCode == UP) {
      // Increase input gain
      inputGain += 5.0;
      inputGain = constrain(inputGain, 1.0, 500.0);
      println("Input Gain: " + inputGain + "x");
    }
    else if (keyCode == DOWN) {
      // Decrease input gain
      inputGain -= 5.0;
      inputGain = constrain(inputGain, 1.0, 500.0);
      println("Input Gain: " + inputGain + "x");
    }
    else if (keyCode == RIGHT) {
      // Increase visual gain
      visualGain += 10.0;
      visualGain = constrain(visualGain, 1.0, 1000.0);
      println("Visual Gain: " + visualGain + "x");
    }
    else if (keyCode == LEFT) {
      // Decrease visual gain
      visualGain -= 10.0;
      visualGain = constrain(visualGain, 1.0, 1000.0);
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
