/*
 * serialEvent.pde
 *
 * THIS IS THE MISSING FILE FROM YOUR PROCESSING SKETCH!
 * This file handles receiving data from Arduino.
 *
 * To use this file:
 * 1. Copy this file to your Processing sketch folder
 * 2. Restart Processing
 * 3. You should see it as a new tab
 *
 * The sketch folder is usually at:
 * Documents/Processing/YourSketchName/
 */

void setupSerial() {
  /*
   * Find and connect to the selected serial port.
   * This is called from the main sketch after port selection.
   */
}

void serialEvent(Serial port) {
  /*
   * This function is called automatically whenever new serial data arrives.
   * It parses the data sent by the Arduino in the format:
   *
   * S512  <- Sensor value (sent every loop)
   * B75   <- BPM value (sent when beat detected)
   * Q800  <- IBI value (sent when beat detected)
   */

  String inData = port.readStringUntil('\n');

  if (inData != null) {
    inData = trim(inData);  // Remove whitespace

    if (inData.length() > 0) {
      // First character indicates data type
      char dataType = inData.charAt(0);

      // Extract the numeric value
      if (inData.length() > 1) {
        String valueString = inData.substring(1);

        try {
          int value = int(valueString);

          // Process based on data type
          if (dataType == 'S') {
            // Sensor data - raw pulse value
            Sensor = value;

          } else if (dataType == 'B') {
            // BPM data - beats per minute
            BPM = value;
            beat = true;    // Flag that a beat occurred
            heart = 20;     // Set heart graphic pulse duration

          } else if (dataType == 'Q') {
            // IBI data - inter-beat interval in milliseconds
            IBI = value;
          }

        } catch (NumberFormatException e) {
          // Ignore malformed data
          println("Error parsing: " + inData);
        }
      }
    }
  }
}
