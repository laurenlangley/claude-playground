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

// AudioSignal that passes through input to output
class MonitorSignal implements AudioSignal {
  void generate(float[] samp) {
    for (int i = 0; i < samp.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        samp[i] = in.left.get(i);
      } else {
        samp[i] = 0;
      }
    }
  }

  void generate(float[] sampL, float[] sampR) {
    for (int i = 0; i < sampL.length; i++) {
      if (monitoring && in != null && i < in.left.size()) {
        sampL[i] = in.left.get(i);
        sampR[i] = in.left.get(i); // Copy left to right (mono)
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
  println("=== AUDIO MONITORING ===");
  println("Press 'M' to toggle audio monitoring (playback)");
  println("WARNING: If using speakers + microphone, this may cause feedback!");
  println("Use headphones to avoid feedback loop.");
  println("Monitoring is currently: OFF");
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

  // Debug: Print audio level every 30 frames
  if (frameCount % 30 == 0) {
    println("Audio level: " + in.mix.level());
    float maxAvg = 0;
    for(int i = 0; i < fft.avgSize(); i++) {
      maxAvg = max(maxAvg, fft.getAvg(i));
    }
    println("Max FFT average: " + maxAvg);
  }

  // Draw frequency bars with color
  colorMode(HSB);
  stroke(hVal, 255, 255);
  colorMode(RGB);

  for(int i = 0; i < fft.avgSize(); i++)
  {
    float barHeight = fft.getAvg(i) * 4;
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

  // Draw status indicators
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

  // Text label for monitoring
  fill(255);
  textSize(12);
  text("Monitoring: " + (monitoring ? "ON" : "OFF"), 45, 15);
  text("Press 'M' to toggle", 45, 30);

  // Update hue value
  hVal += 2;
  if(hVal > 255)
  {
    hVal = 0;
  }
}

// Toggle audio monitoring with 'M' key
void keyPressed() {
  if (key == 'm' || key == 'M') {
    monitoring = !monitoring;
    println("Audio monitoring: " + (monitoring ? "ON" : "OFF"));

    if (monitoring) {
      println("WARNING: Feedback may occur if using speakers!");
    }
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
