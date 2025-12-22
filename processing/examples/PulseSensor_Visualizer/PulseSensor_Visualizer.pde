/*
 * Pulse Sensor Visualizer
 *
 * Visualizes pulse sensor data from Arduino in real-time
 * Displays waveform, BPM, and connection status
 *
 * IMPORTANT: Update the serialPort variable below with your Arduino's port!
 *
 * Common port names:
 * - Windows: "COM3", "COM4", etc.
 * - Mac: "/dev/tty.usbmodem14101", "/dev/cu.usbserial-*"
 * - Linux: "/dev/ttyUSB0", "/dev/ttyACM0"
 *
 * Prerequisites:
 * - Arduino must be running and connected
 * - Arduino sketch must be sending data via Serial
 * - Processing Serial library must be installed
 */

import processing.serial.*;

// Serial Communication
Serial serialPort;
String portName = "COM3";  // CHANGE THIS TO YOUR PORT!
int baudRate = 9600;

// Data Storage
int[] signalValues = new int[500];  // Store last 500 readings
int signalIndex = 0;
int currentSignal = 0;
int currentBPM = 0;
int threshold = 550;

// Visual Settings
int graphHeight = 300;
int graphY = 150;
color pulseColor = color(255, 0, 0);
color backgroundColor = color(0);
color gridColor = color(50);
boolean sensorConnected = false;

// Animation
int heartSize = 100;
float heartBeat = 0;

void setup() {
  size(800, 600);

  // List available serial ports
  println("Available serial ports:");
  printArray(Serial.list());
  println();

  // Try to connect to serial port
  try {
    serialPort = new Serial(this, portName, baudRate);
    serialPort.bufferUntil('\n');
    println("Connected to: " + portName);
    sensorConnected = true;
  } catch (Exception e) {
    println("ERROR: Could not connect to " + portName);
    println("Please update the portName variable with your Arduino port.");
    println("Check the list above for available ports.");
    sensorConnected = false;
  }

  // Initialize signal array
  for (int i = 0; i < signalValues.length; i++) {
    signalValues[i] = height / 2;
  }

  frameRate(60);
}

void draw() {
  background(backgroundColor);

  // Draw grid
  drawGrid();

  // Draw header
  drawHeader();

  // Draw signal waveform
  drawWaveform();

  // Draw BPM display
  drawBPM();

  // Draw heart animation
  drawHeart();

  // Draw connection status
  drawStatus();

  // Draw instructions
  drawInstructions();
}

void drawGrid() {
  stroke(gridColor);
  strokeWeight(1);

  // Horizontal lines
  for (int y = graphY; y <= graphY + graphHeight; y += 50) {
    line(50, y, width - 50, y);
  }

  // Vertical lines
  for (int x = 50; x <= width - 50; x += 50) {
    line(x, graphY, x, graphY + graphHeight);
  }
}

void drawHeader() {
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text("Pulse Sensor Monitor", width / 2, 40);

  textSize(12);
  text("Real-time Heart Rate Visualization", width / 2, 60);
}

void drawWaveform() {
  // Draw threshold line
  stroke(100, 100, 255);
  strokeWeight(1);
  float thresholdY = map(threshold, 0, 1023, graphY + graphHeight, graphY);
  line(50, thresholdY, width - 50, thresholdY);

  // Draw signal line
  stroke(pulseColor);
  strokeWeight(2);
  noFill();

  beginShape();
  for (int i = 0; i < signalValues.length; i++) {
    int arrayIndex = (signalIndex + i) % signalValues.length;
    float x = map(i, 0, signalValues.length, 50, width - 50);
    float y = map(signalValues[arrayIndex], 0, 1023, graphY + graphHeight, graphY);
    vertex(x, y);
  }
  endShape();

  // Label
  fill(255);
  textAlign(LEFT);
  textSize(10);
  text("Signal", 55, graphY - 5);
  text("Threshold", 55, thresholdY - 5);
}

void drawBPM() {
  // BPM display box
  int boxX = width / 2 - 100;
  int boxY = graphY + graphHeight + 50;
  int boxW = 200;
  int boxH = 80;

  // Box background
  if (currentBPM > 0) {
    fill(20, 100, 20);  // Green when valid
  } else {
    fill(50);  // Gray when no reading
  }
  stroke(100);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 10);

  // BPM text
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("HEART RATE", boxX + boxW / 2, boxY + 20);

  textSize(36);
  if (currentBPM > 0 && currentBPM < 200) {
    text(currentBPM, boxX + boxW / 2, boxY + 55);
  } else {
    text("--", boxX + boxW / 2, boxY + 55);
  }

  textSize(12);
  text("BPM", boxX + boxW / 2, boxY + 70);
}

void drawHeart() {
  // Animated heart that beats with pulse
  pushMatrix();
  translate(width - 150, graphY + graphHeight + 90);

  // Pulse animation
  if (currentBPM > 0) {
    heartBeat = heartBeat * 0.9 + 0.1;  // Decay
  }
  float scale = 1.0 + heartBeat * 0.3;

  scale(scale);
  fill(255, 0, 0, 150 + heartBeat * 105);
  noStroke();

  // Draw heart shape
  beginShape();
  for (float t = 0; t < TWO_PI; t += 0.1) {
    float x = 16 * pow(sin(t), 3);
    float y = -(13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t));
    vertex(x * 2, y * 2);
  }
  endShape(CLOSE);

  popMatrix();
}

void drawStatus() {
  fill(255);
  textAlign(LEFT);
  textSize(12);

  int statusX = 50;
  int statusY = graphY + graphHeight + 50;

  text("Status:", statusX, statusY);

  if (sensorConnected) {
    fill(0, 255, 0);
    text("● Connected", statusX, statusY + 20);
  } else {
    fill(255, 0, 0);
    text("● Disconnected", statusX, statusY + 20);
  }

  fill(255);
  textSize(10);
  text("Port: " + portName, statusX, statusY + 40);
  text("Signal: " + currentSignal, statusX, statusY + 55);
}

void drawInstructions() {
  fill(150);
  textAlign(CENTER);
  textSize(10);
  text("Press 'r' to reconnect | Press 'p' to list ports | Press 's' to save screenshot", width / 2, height - 20);
}

void serialEvent(Serial port) {
  try {
    String data = port.readStringUntil('\n');

    if (data != null) {
      data = trim(data);

      // Skip debug messages that don't contain numbers
      if (data.contains("===") || data.contains("---") || data.contains("Pulse") ||
          data.contains("Status") || data.contains("Uptime") || data.length() == 0) {
        return;
      }

      // Parse comma-separated values (from Serial Plotter format)
      // Format: Signal,Threshold,BPM_scaled,Connected
      String[] values = split(data, ',');

      if (values.length >= 1) {
        // Parse signal value
        currentSignal = int(trim(values[0]));

        // Store in array
        signalValues[signalIndex] = currentSignal;
        signalIndex = (signalIndex + 1) % signalValues.length;

        // Parse threshold if available
        if (values.length >= 2) {
          threshold = int(trim(values[1]));
        }

        // Parse BPM if available (need to unscale it)
        if (values.length >= 3) {
          int bpmScaled = int(trim(values[2]));
          currentBPM = bpmScaled / 5;  // Unscale

          // Trigger heart beat animation
          if (currentBPM > 0) {
            heartBeat = 1.0;
          }
        }
      }
    }
  } catch (Exception e) {
    println("Error parsing data: " + e.getMessage());
  }
}

// Keyboard controls
void keyPressed() {
  if (key == 'r' || key == 'R') {
    // Reconnect
    println("Attempting to reconnect...");
    if (serialPort != null) {
      serialPort.stop();
    }
    try {
      serialPort = new Serial(this, portName, baudRate);
      serialPort.bufferUntil('\n');
      sensorConnected = true;
      println("Reconnected!");
    } catch (Exception e) {
      println("Reconnection failed: " + e.getMessage());
      sensorConnected = false;
    }
  }

  if (key == 'p' || key == 'P') {
    // Print available ports
    println("\nAvailable serial ports:");
    printArray(Serial.list());
  }

  if (key == 's' || key == 'S') {
    // Save screenshot
    String filename = "pulse_" + year() + month() + day() + "_" + hour() + minute() + second() + ".png";
    saveFrame(filename);
    println("Screenshot saved: " + filename);
  }
}
