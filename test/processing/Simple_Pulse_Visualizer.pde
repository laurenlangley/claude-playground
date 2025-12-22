/*
 * SIMPLE PULSE SENSOR VISUALIZER
 *
 * This is a SIMPLE visualizer to see if your sensor is working.
 * Shows the raw signal as a waveform.
 *
 * REQUIREMENTS:
 * - Arduino must be running and connected
 * - Arduino must be sending "S" + number format (like the test sketch)
 *
 * SETUP:
 * 1. Update the portName below (see instructions)
 * 2. Make sure baud rate matches Arduino (115200)
 * 3. Run this sketch
 *
 * WHAT YOU'LL SEE:
 * - Red waveform showing sensor signal
 * - Green threshold line
 * - Current signal value
 * - Connection status
 *
 * HOW TO FIND YOUR PORT:
 * Windows: Usually "COM3", "COM4", etc.
 * Mac: Usually "/dev/cu.usbmodem..." or "/dev/tty.usbmodem..."
 * Linux: Usually "/dev/ttyACM0" or "/dev/ttyUSB0"
 *
 * Press 'p' to see all available ports in console
 */

import processing.serial.*;

// ===== CONFIGURATION =====
String portName = "COM3";  // ← CHANGE THIS TO YOUR ARDUINO PORT!
int baudRate = 115200;     // Must match Arduino

// ===== VARIABLES =====
Serial port;
boolean connected = false;

int[] signalData = new int[500];  // Store last 500 readings
int dataIndex = 0;
int currentSignal = 0;
int threshold = 550;
boolean isPulse = false;

// Colors
color bgColor = color(20);
color signalColor = color(255, 50, 50);
color thresholdColor = color(100, 255, 100);
color textColor = color(255);

void setup() {
  size(800, 600);
  frameRate(60);

  // Initialize signal array
  for (int i = 0; i < signalData.length; i++) {
    signalData[i] = 512;
  }

  println("╔════════════════════════════════════════╗");
  println("║   SIMPLE PULSE SENSOR VISUALIZER       ║");
  println("╚════════════════════════════════════════╝");
  println();
  println("Available Serial Ports:");
  String[] ports = Serial.list();
  for (int i = 0; i < ports.length; i++) {
    println("  [" + i + "] " + ports[i]);
  }
  println();

  // Try to connect
  try {
    port = new Serial(this, portName, baudRate);
    port.bufferUntil('\n');
    connected = true;
    println("✓ Connected to: " + portName);
    println("✓ Baud rate: " + baudRate);
    println();
    println("Listening for data...");
    println("(Data should be in format: S512)");
  } catch (Exception e) {
    println("✗ ERROR: Could not connect to " + portName);
    println();
    println("Please update portName in the code!");
    println("Your Arduino port is one of the ports listed above.");
    connected = false;
  }

  textAlign(LEFT);
}

void draw() {
  background(bgColor);

  // Draw title
  fill(textColor);
  textSize(20);
  text("Pulse Sensor Hardware Test - Live View", 20, 30);

  // Draw connection status
  textSize(14);
  if (connected) {
    fill(100, 255, 100);
    text("● CONNECTED", 20, 55);
    fill(textColor);
    text("Port: " + portName + " @ " + baudRate + " baud", 150, 55);
  } else {
    fill(255, 100, 100);
    text("● DISCONNECTED", 20, 55);
    fill(textColor);
    text("Update portName and restart", 150, 55);
  }

  // Draw signal graph area
  int graphX = 50;
  int graphY = 100;
  int graphW = width - 100;
  int graphH = 300;

  // Background
  fill(40);
  noStroke();
  rect(graphX, graphY, graphW, graphH);

  // Grid lines
  stroke(60);
  strokeWeight(1);
  for (int i = 0; i <= 10; i++) {
    float y = graphY + (graphH / 10) * i;
    line(graphX, y, graphX + graphW, y);
  }

  // Threshold line
  stroke(thresholdColor);
  strokeWeight(2);
  float thresholdY = map(threshold, 0, 1023, graphY + graphH, graphY);
  line(graphX, thresholdY, graphX + graphW, thresholdY);

  // Draw threshold label
  fill(thresholdColor);
  noStroke();
  textSize(12);
  text("Threshold: " + threshold, graphX + 5, thresholdY - 5);

  // Draw signal waveform
  stroke(signalColor);
  strokeWeight(2);
  noFill();

  beginShape();
  for (int i = 0; i < signalData.length; i++) {
    int index = (dataIndex + i) % signalData.length;
    float x = map(i, 0, signalData.length, graphX, graphX + graphW);
    float y = map(signalData[index], 0, 1023, graphY + graphH, graphY);
    vertex(x, y);
  }
  endShape();

  // Draw current values
  fill(textColor);
  textSize(16);
  int infoY = graphY + graphH + 40;

  text("Current Signal Value:", 50, infoY);
  textSize(36);
  fill(signalColor);
  text(currentSignal, 250, infoY);

  // Status indicator
  textSize(16);
  fill(textColor);
  text("Status:", 50, infoY + 50);

  if (currentSignal > threshold) {
    fill(255, 100, 100);
    textSize(24);
    text("♥ PULSE DETECTED", 250, infoY + 50);
  } else {
    fill(150);
    textSize(20);
    text("No pulse", 250, infoY + 50);
  }

  // Signal range info
  int minVal = 1023;
  int maxVal = 0;
  for (int val : signalData) {
    minVal = min(minVal, val);
    maxVal = max(maxVal, val);
  }
  int range = maxVal - minVal;

  fill(textColor);
  textSize(14);
  text("Signal Range: " + minVal + " - " + maxVal + " (variation: " + range + ")", 50, infoY + 90);

  // Diagnostics
  fill(textColor);
  textSize(12);
  text("Press 'p' to list ports | 'r' to reconnect | 's' to save screenshot", 50, height - 20);

  // Diagnostic messages
  if (connected && currentSignal == 0) {
    fill(255, 200, 0);
    textSize(14);
    text("⚠ No data received yet - waiting for Arduino...", 50, infoY + 120);
  } else if (range < 10) {
    fill(255, 200, 0);
    textSize(14);
    text("⚠ Very low signal variation - check sensor contact", 50, infoY + 120);
  } else if (range > 10 && range < 30) {
    fill(255, 200, 0);
    textSize(14);
    text("⚠ Weak signal - try different finger or adjust pressure", 50, infoY + 120);
  } else if (range >= 30) {
    fill(100, 255, 100);
    textSize(14);
    text("✓ Good signal strength!", 50, infoY + 120);
  }
}

void serialEvent(Serial p) {
  try {
    String data = p.readStringUntil('\n');

    if (data != null) {
      data = trim(data);

      // Look for 'S' prefix (sensor data)
      if (data.length() > 1 && data.charAt(0) == 'S') {
        String valueStr = data.substring(1);
        currentSignal = int(valueStr);

        // Add to array
        signalData[dataIndex] = currentSignal;
        dataIndex = (dataIndex + 1) % signalData.length;
      }
    }
  } catch (Exception e) {
    println("Error parsing data: " + e.getMessage());
  }
}

void keyPressed() {
  if (key == 'p' || key == 'P') {
    println("\n=== Available Ports ===");
    String[] ports = Serial.list();
    for (int i = 0; i < ports.length; i++) {
      println("  [" + i + "] " + ports[i]);
    }
    println("=======================\n");
  }

  if (key == 'r' || key == 'R') {
    println("\nAttempting to reconnect...");
    if (port != null) {
      port.stop();
    }
    try {
      port = new Serial(this, portName, baudRate);
      port.bufferUntil('\n');
      connected = true;
      println("✓ Reconnected!");
    } catch (Exception e) {
      println("✗ Reconnection failed: " + e.getMessage());
      connected = false;
    }
  }

  if (key == 's' || key == 'S') {
    String filename = "pulse_test_" + year() + month() + day() + "_" + hour() + minute() + second() + ".png";
    saveFrame(filename);
    println("Screenshot saved: " + filename);
  }
}
