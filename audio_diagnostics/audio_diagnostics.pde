// Audio Input Diagnostic Tool
// This will help identify why audio isn't being detected

import ddf.minim.*;
import ddf.minim.analysis.*;

Minim minim;
AudioInput in;
String status = "Initializing...";
boolean audioWorking = false;

void setup() {
  size(640, 480);
  textSize(14);

  println("=== AUDIO DIAGNOSTICS ===");
  println();

  try {
    minim = new Minim(this);
    println("✓ Minim library loaded successfully");
    println();

    // List available audio mixers (devices)
    println("Available audio mixers:");
    String[] mixers = minim.listMixers();
    if (mixers.length == 0) {
      println("  WARNING: No audio mixers found!");
    } else {
      for (int i = 0; i < mixers.length; i++) {
        println("  " + i + ": " + mixers[i]);
      }
    }
    println();

    // Try to get audio input - MONO first (more compatible)
    println("Attempting to get audio input (MONO, 512 buffer)...");
    try {
      in = minim.getLineIn(Minim.MONO, 512);
      println("✓ Audio input created successfully");
      println("  Buffer size: " + in.bufferSize());
      println("  Sample rate: " + in.sampleRate());
      println("  Format: " + in.getFormat());
      audioWorking = true;
      status = "Audio input active - Make noise near microphone!";
    } catch (Exception e) {
      println("✗ Failed to get audio input:");
      println("  " + e.getMessage());
      status = "ERROR: Could not get audio input";
    }

  } catch (Exception e) {
    println("✗ Fatal error:");
    println("  " + e.getMessage());
    status = "FATAL ERROR: " + e.getMessage();
  }

  println();
  println("=== END DIAGNOSTICS ===");
  println();

  if (audioWorking) {
    println("Monitoring audio levels (watch this console)...");
  }
}

void draw() {
  background(0);

  // Display status
  fill(audioWorking ? color(0, 255, 0) : color(255, 0, 0));
  text(status, 10, 30);

  if (audioWorking && in != null) {
    // Get audio levels
    float level = in.mix.level();
    float leftLevel = in.left.level();
    float rightLevel = in.right.level();

    // Display levels as text
    fill(255);
    text("Mix Level: " + nf(level, 0, 4), 10, 60);
    text("Left Level: " + nf(leftLevel, 0, 4), 10, 80);
    text("Right Level: " + nf(rightLevel, 0, 4), 10, 100);

    // Visual meter for mix level
    fill(0, 255, 0);
    float meterWidth = level * width * 10; // Amplify for visibility
    rect(10, 120, meterWidth, 30);
    stroke(255);
    noFill();
    rect(10, 120, width - 20, 30);

    // Draw waveform
    stroke(0, 255, 0);
    for (int i = 0; i < in.bufferSize() - 1; i++) {
      float x1 = map(i, 0, in.bufferSize(), 0, width);
      float x2 = map(i + 1, 0, in.bufferSize(), 0, width);
      line(x1, 200 + in.left.get(i) * 100,
           x2, 200 + in.left.get(i + 1) * 100);
    }

    // Print to console periodically
    if (frameCount % 30 == 0) {
      println("Level: " + nf(level, 0, 4) + " | Left: " + nf(leftLevel, 0, 4) + " | Right: " + nf(rightLevel, 0, 4));

      if (level > 0.01) {
        println("  ✓ AUDIO DETECTED!");
      }
    }

    // Instructions
    fill(255);
    text("If the level stays at 0.0000:", 10, 280);
    text("1. Check microphone is connected and not muted", 10, 300);
    text("2. Check system sound settings (correct input device)", 10, 320);
    text("3. Grant microphone permissions (macOS/Linux)", 10, 340);
    text("4. Try speaking/clapping near the microphone", 10, 360);

  } else {
    // Show error info
    fill(255, 0, 0);
    text("Audio input failed to initialize!", 10, 80);
    fill(255);
    text("Common fixes:", 10, 120);
    text("• Check if microphone is connected", 10, 140);
    text("• macOS: System Preferences > Security > Microphone > Enable for Processing", 10, 160);
    text("• Linux: Check PulseAudio/ALSA settings", 10, 180);
    text("• Windows: Check Sound settings > Recording devices", 10, 200);
    text("• Try running Processing as administrator", 10, 220);
  }
}

void stop() {
  if (in != null) {
    in.close();
  }
  if (minim != null) {
    minim.stop();
  }
  super.stop();
}
