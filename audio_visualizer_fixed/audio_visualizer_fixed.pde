import ddf.minim.analysis.*;
import ddf.minim.*;

Minim minim;
AudioInput in;
FFT fft;
int w;
PImage fade;

int hVal;

float rWidth, rHeight;

void setup()
{
  size(640, 480, P3D);

  minim = new Minim(this);

  // Try to get audio input - this is where it often fails
  in = minim.getLineIn(Minim.STEREO, 512);

  // Debug: Print audio input info
  println("Audio input created");
  println("Buffer size: " + in.bufferSize());
  println("Sample rate: " + in.sampleRate());

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

  // Draw a simple indicator that the sketch is running
  fill(0, 255, 0);
  noStroke();
  ellipse(10, 10, 10, 10);

  // Update hue value
  hVal += 2;
  if(hVal > 255)
  {
    hVal = 0;
  }
}

// Clean up audio on exit
void stop()
{
  in.close();
  minim.stop();
  super.stop();
}
