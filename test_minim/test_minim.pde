// Minimal test to verify Minim is installed
import ddf.minim.*;

Minim audioContext;

void setup() {
  size(400, 200);

  try {
    audioContext = new Minim(this);
    println("SUCCESS: Minim library loaded!");
    println("Minim version: " + audioContext.getClass().getPackage().getImplementationVersion());
  } catch (Exception e) {
    println("ERROR: Minim failed to load");
    println(e.getMessage());
  }
}

void draw() {
  background(0);
  fill(0, 255, 0);
  textAlign(CENTER, CENTER);
  textSize(20);

  if (audioContext != null) {
    text("✓ Minim is working!", width/2, height/2);
  } else {
    fill(255, 0, 0);
    text("✗ Minim not loaded", width/2, height/2);
  }
}

void stop() {
  if (audioContext != null) {
    audioContext.stop();
  }
  super.stop();
}
