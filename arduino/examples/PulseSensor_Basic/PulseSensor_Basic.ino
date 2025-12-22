/*
 * Pulse Sensor Basic Example
 *
 * Reads pulse sensor data and outputs to Serial Monitor
 * This is a debugging-friendly version with verbose output
 *
 * Hardware Setup:
 * - Pulse Sensor Red wire (VCC) -> Arduino 5V
 * - Pulse Sensor Black wire (GND) -> Arduino GND
 * - Pulse Sensor Purple wire (Signal) -> Arduino A0
 *
 * Serial Monitor: Set to 9600 baud
 */

// Pin Configuration
const int PULSE_SENSOR_PIN = A0;  // Analog pin where pulse sensor is connected
const int LED_PIN = 13;            // Built-in LED for heartbeat visualization

// Variables
int Signal;                        // Holds the incoming raw data from sensor
int Threshold = 550;               // Threshold for detecting a pulse (adjust as needed)
boolean pulseDetected = false;     // True when pulse is detected
unsigned long lastBeatTime = 0;    // Time of last detected beat
int BPM = 0;                       // Beats per minute

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  Serial.println("=== Pulse Sensor Debug Mode ===");
  Serial.println("Initializing...");

  // Configure LED pin
  pinMode(LED_PIN, OUTPUT);

  // Print configuration
  Serial.print("Pulse sensor on pin: A");
  Serial.println(PULSE_SENSOR_PIN);
  Serial.print("Detection threshold: ");
  Serial.println(Threshold);
  Serial.println("Place finger on sensor...");
  Serial.println("---");

  delay(1000);
}

void loop() {
  // Read the pulse sensor value
  Signal = analogRead(PULSE_SENSOR_PIN);

  // Print raw signal value for debugging (every 100ms)
  static unsigned long lastPrintTime = 0;
  if (millis() - lastPrintTime > 100) {
    Serial.print("Raw Signal: ");
    Serial.print(Signal);
    Serial.print(" | Threshold: ");
    Serial.print(Threshold);

    // Simple pulse detection
    if (Signal > Threshold && !pulseDetected) {
      pulseDetected = true;
      digitalWrite(LED_PIN, HIGH);

      // Calculate BPM
      unsigned long currentTime = millis();
      if (lastBeatTime != 0) {
        unsigned long timeBetweenBeats = currentTime - lastBeatTime;
        BPM = 60000 / timeBetweenBeats;  // Convert to beats per minute

        // Filter out unrealistic values
        if (BPM > 40 && BPM < 200) {
          Serial.print(" | ♥ BEAT! BPM: ");
          Serial.print(BPM);
        } else {
          Serial.print(" | ♥ BEAT! (BPM calculation stabilizing...)");
        }
      } else {
        Serial.print(" | ♥ BEAT!");
      }

      lastBeatTime = currentTime;
    } else if (Signal < Threshold && pulseDetected) {
      pulseDetected = false;
      digitalWrite(LED_PIN, LOW);
    }

    Serial.println();
    lastPrintTime = millis();
  }

  delay(10);  // Small delay for stability
}
