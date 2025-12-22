/*
 * Simple Serial Monitor for Pulse Sensor
 *
 * A basic serial data viewer for debugging Arduino communication
 * Displays raw serial data in a scrolling text window
 *
 * IMPORTANT: Update the portName variable with your Arduino's port!
 */

import processing.serial.*;

Serial serialPort;
String portName = "COM3";  // CHANGE THIS!
int baudRate = 9600;

String[] messages = new String[30];  // Store last 30 messages
int messageIndex = 0;

void setup() {
  size(600, 500);

  // Initialize message array
  for (int i = 0; i < messages.length; i++) {
    messages[i] = "";
  }

  // List available ports
  println("=== Available Serial Ports ===");
  String[] ports = Serial.list();
  for (int i = 0; i < ports.length; i++) {
    println(i + ": " + ports[i]);
  }
  println("\nUpdate portName in code to match your Arduino port.");
  println("==============================\n");

  // Try to connect
  try {
    serialPort = new Serial(this, portName, baudRate);
    serialPort.bufferUntil('\n');
    addMessage("✓ Connected to: " + portName);
    addMessage("Listening for data...");
  } catch (Exception e) {
    addMessage("✗ ERROR: Could not connect to " + portName);
    addMessage("Check port name and try again.");
    addMessage("Press 'p' to see available ports.");
  }

  textFont(createFont("Courier", 12));
}

void draw() {
  background(20);

  // Title
  fill(100, 200, 255);
  textSize(16);
  textAlign(CENTER);
  text("Serial Monitor - Pulse Sensor Debug", width/2, 30);

  // Port info
  fill(150);
  textSize(10);
  text("Port: " + portName + " @ " + baudRate + " baud", width/2, 50);

  // Draw message window
  fill(0);
  stroke(100);
  strokeWeight(2);
  rect(20, 70, width - 40, height - 120, 5);

  // Display messages
  fill(0, 255, 0);
  textAlign(LEFT);
  textSize(12);
  noStroke();

  int y = 90;
  for (int i = 0; i < messages.length; i++) {
    int index = (messageIndex + i) % messages.length;
    if (messages[index] != null && messages[index].length() > 0) {
      text(messages[index], 30, y);
      y += 15;
    }
  }

  // Instructions
  fill(150);
  textAlign(CENTER);
  textSize(10);
  text("Press 'p' for ports | 'r' to reconnect | 'c' to clear | 's' to save log", width/2, height - 20);
}

void serialEvent(Serial port) {
  String data = port.readStringUntil('\n');
  if (data != null) {
    data = trim(data);
    if (data.length() > 0) {
      addMessage(data);
      println(data);  // Also print to Processing console
    }
  }
}

void addMessage(String msg) {
  // Add timestamp
  String timeStamp = nf(hour(), 2) + ":" + nf(minute(), 2) + ":" + nf(second(), 2);
  messages[messageIndex] = timeStamp + " > " + msg;
  messageIndex = (messageIndex + 1) % messages.length;
}

void keyPressed() {
  if (key == 'p' || key == 'P') {
    // Print ports
    println("\n=== Available Serial Ports ===");
    String[] ports = Serial.list();
    for (int i = 0; i < ports.length; i++) {
      println(i + ": " + ports[i]);
    }
    println("==============================\n");
    addMessage("Port list printed to console");
  }

  if (key == 'r' || key == 'R') {
    // Reconnect
    if (serialPort != null) {
      serialPort.stop();
    }
    try {
      serialPort = new Serial(this, portName, baudRate);
      serialPort.bufferUntil('\n');
      addMessage("✓ Reconnected to " + portName);
    } catch (Exception e) {
      addMessage("✗ Reconnection failed");
    }
  }

  if (key == 'c' || key == 'C') {
    // Clear messages
    for (int i = 0; i < messages.length; i++) {
      messages[i] = "";
    }
    messageIndex = 0;
    addMessage("Display cleared");
  }

  if (key == 's' || key == 'S') {
    // Save log
    String[] log = new String[messages.length];
    for (int i = 0; i < messages.length; i++) {
      int index = (messageIndex + i) % messages.length;
      log[i] = messages[index];
    }
    String filename = "serial_log_" + year() + month() + day() + "_" + hour() + minute() + second() + ".txt";
    saveStrings(filename, log);
    addMessage("Log saved: " + filename);
    println("Log saved: " + filename);
  }
}
