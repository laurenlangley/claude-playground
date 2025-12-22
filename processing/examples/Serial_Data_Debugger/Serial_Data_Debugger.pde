/*
 * Serial Data Format Debugger
 *
 * This tool shows you EXACTLY what your Arduino is sending
 * so you can verify the format matches what Processing expects.
 *
 * EXPECTED FORMAT for Pulse Sensor Visualizer:
 * S512    <- 'S' followed by sensor value
 * B75     <- 'B' followed by BPM value
 * Q800    <- 'Q' followed by IBI value
 *
 * HOW TO USE:
 * 1. Update portName below
 * 2. Update baudRate to match Arduino (usually 115200)
 * 3. Run this sketch
 * 4. Watch the output to see if format is correct
 */

import processing.serial.*;

Serial port;
String portName = "COM3";  // UPDATE THIS!
int baudRate = 115200;     // UPDATE THIS to match Arduino!

String[] receivedLines = new String[25];
int lineIndex = 0;

int sensorCount = 0;
int bpmCount = 0;
int ibiCount = 0;

void setup() {
  size(800, 600);
  textFont(createFont("Courier", 12));

  // Initialize display
  for (int i = 0; i < receivedLines.length; i++) {
    receivedLines[i] = "";
  }

  println("=== Available Ports ===");
  printArray(Serial.list());
  println("=======================\n");

  // Try to connect
  try {
    port = new Serial(this, portName, baudRate);
    port.bufferUntil('\n');
    addLine("✓ Connected to: " + portName + " @ " + baudRate);
    addLine("Listening for data...");
    addLine("---");
  } catch (Exception e) {
    addLine("✗ ERROR: Can't connect to " + portName);
    addLine("Press 'p' to see available ports");
  }
}

void draw() {
  background(20);

  // Title
  fill(100, 200, 255);
  textSize(18);
  textAlign(CENTER);
  text("Serial Data Format Debugger", width/2, 30);

  // Port info
  fill(150);
  textSize(12);
  text("Port: " + portName + " @ " + baudRate + " baud", width/2, 55);

  // Stats box
  fill(40);
  stroke(100);
  strokeWeight(2);
  rect(20, 80, width - 40, 80);

  fill(0, 255, 0);
  noStroke();
  textAlign(LEFT);
  textSize(14);
  text("Received Counts:", 30, 100);
  text("'S' (Sensor): " + sensorCount, 30, 120);
  text("'B' (BPM): " + bpmCount, 30, 140);
  text("'Q' (IBI): " + ibiCount, 30, 150);

  // Expected format
  fill(255, 255, 100);
  text("EXPECTED FORMAT:", 300, 100);
  fill(200);
  text("S512  ← 'S' + sensor value", 300, 120);
  text("B75   ← 'B' + BPM value", 300, 140);
  text("Q800  ← 'Q' + IBI value", 300, 150);

  // Raw data window
  fill(0);
  rect(20, 180, width - 40, height - 250);

  fill(0, 255, 0);
  textSize(12);
  text("RAW DATA (last 25 lines):", 30, 200);

  // Display received lines
  int y = 220;
  for (int i = 0; i < receivedLines.length; i++) {
    int index = (lineIndex + i) % receivedLines.length;
    if (receivedLines[index] != null && receivedLines[index].length() > 0) {

      // Color code by type
      if (receivedLines[index].startsWith("S")) {
        fill(100, 200, 255);  // Blue for sensor
      } else if (receivedLines[index].startsWith("B")) {
        fill(255, 100, 100);  // Red for BPM
      } else if (receivedLines[index].startsWith("Q")) {
        fill(100, 255, 100);  // Green for IBI
      } else {
        fill(255, 255, 0);    // Yellow for unexpected
      }

      text(receivedLines[index], 30, y);
      y += 15;
    }
  }

  // Instructions
  fill(150);
  textAlign(CENTER);
  textSize(11);
  text("Press 'p' for available ports | 'r' to reconnect | 'c' to clear | 's' to save log", width/2, height - 20);

  // Diagnosis
  fill(255, 200, 0);
  textAlign(LEFT);
  textSize(13);
  y = height - 60;
  if (sensorCount == 0 && bpmCount == 0 && ibiCount == 0) {
    text("⚠ NO DATA RECEIVED - Check Arduino is running and sending data", 30, y);
  } else if (sensorCount > 0 && bpmCount == 0) {
    text("✓ Receiving sensor data | ⚠ NO heartbeat data - Check pulse detection in Arduino", 30, y);
  } else if (sensorCount > 0 && bpmCount > 0) {
    fill(0, 255, 0);
    text("✓ Receiving ALL data types - Format looks good!", 30, y);
  }
}

void serialEvent(Serial port) {
  String data = port.readStringUntil('\n');

  if (data != null) {
    data = trim(data);

    if (data.length() > 0) {
      // Count message types
      if (data.charAt(0) == 'S') {
        sensorCount++;
      } else if (data.charAt(0) == 'B') {
        bpmCount++;
      } else if (data.charAt(0) == 'Q') {
        ibiCount++;
      }

      // Add to display
      String timeStamp = nf(hour(), 2) + ":" + nf(minute(), 2) + ":" + nf(second(), 2);
      addLine(timeStamp + " > " + data);

      // Also print to console
      println(data);
    }
  }
}

void addLine(String line) {
  receivedLines[lineIndex] = line;
  lineIndex = (lineIndex + 1) % receivedLines.length;
}

void keyPressed() {
  if (key == 'p' || key == 'P') {
    println("\n=== Available Ports ===");
    printArray(Serial.list());
    println("=======================\n");
    addLine("Port list printed to console");
  }

  if (key == 'r' || key == 'R') {
    if (port != null) {
      port.stop();
    }
    try {
      port = new Serial(this, portName, baudRate);
      port.bufferUntil('\n');
      addLine("✓ Reconnected");
      sensorCount = 0;
      bpmCount = 0;
      ibiCount = 0;
    } catch (Exception e) {
      addLine("✗ Reconnection failed");
    }
  }

  if (key == 'c' || key == 'C') {
    for (int i = 0; i < receivedLines.length; i++) {
      receivedLines[i] = "";
    }
    lineIndex = 0;
    sensorCount = 0;
    bpmCount = 0;
    ibiCount = 0;
  }

  if (key == 's' || key == 'S') {
    String filename = "serial_debug_" + year() + month() + day() + "_" + hour() + minute() + second() + ".txt";
    String[] log = new String[receivedLines.length + 5];
    log[0] = "Serial Data Debug Log";
    log[1] = "Port: " + portName + " @ " + baudRate;
    log[2] = "Sensor messages: " + sensorCount;
    log[3] = "BPM messages: " + bpmCount;
    log[4] = "IBI messages: " + ibiCount;

    for (int i = 0; i < receivedLines.length; i++) {
      int index = (lineIndex + i) % receivedLines.length;
      log[i + 5] = receivedLines[index];
    }

    saveStrings(filename, log);
    addLine("Log saved: " + filename);
    println("Log saved: " + filename);
  }
}
