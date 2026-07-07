/*
 * MAX30102 QUICK TEST
 *
 * Simple test to verify your MAX30102 sensor works!
 * Shows heart rate (BPM) and blood oxygen (SpO2)
 *
 * REQUIRED LIBRARY:
 * Install "SparkFun MAX3010x Pulse and Proximity Sensor Library"
 * (Sketch → Include Library → Manage Libraries → Search "MAX30105")
 *
 * WIRING:
 * MAX30102 VIN → Arduino 5V (or 3.3V if your module requires it)
 * MAX30102 GND → Arduino GND
 * MAX30102 SDA → Arduino A4
 * MAX30102 SCL → Arduino A5
 *
 * USAGE:
 * 1. Upload this sketch
 * 2. Open Serial Monitor (115200 baud)
 * 3. Place finger GENTLY on sensor
 * 4. Cover the sensor completely
 * 5. Don't press too hard!
 * 6. Stay still for 5-10 seconds
 *
 * Serial Monitor: 115200 baud
 */

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 particleSensor;

// Variables
const byte RATE_SIZE = 4; // Increase for more averaging (4-10)
byte rates[RATE_SIZE];    // Array of heart rates
byte rateSpot = 0;
long lastBeat = 0;        // Time of last beat

float beatsPerMinute;
int beatAvg;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║   MAX30102 QUICK TEST                  ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();

  // Initialize sensor
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("❌ MAX30102 NOT FOUND!");
    Serial.println();
    Serial.println("Troubleshooting:");
    Serial.println("  1. Check wiring:");
    Serial.println("     VIN → 5V");
    Serial.println("     GND → GND");
    Serial.println("     SDA → A4");
    Serial.println("     SCL → A5");
    Serial.println();
    Serial.println("  2. Try 3.3V instead of 5V (some modules need this)");
    Serial.println("  3. Run I2C_Scanner sketch to check connection");
    Serial.println("  4. Verify library is installed correctly");
    Serial.println();
    Serial.println("Halting...");
    while (1);
  }

  Serial.println("✓ MAX30102 Found!");
  Serial.println();

  // Configure sensor
  Serial.println("Configuring sensor...");
  particleSensor.setup();                    // Configure with default settings
  particleSensor.setPulseAmplitudeRed(0x0A); // Turn Red LED to low to indicate sensor is running
  particleSensor.setPulseAmplitudeGreen(0);  // Turn off Green LED

  Serial.println("✓ Sensor configured");
  Serial.println();
  Serial.println("Instructions:");
  Serial.println("  • Place finger GENTLY on sensor");
  Serial.println("  • Cover the sensor completely");
  Serial.println("  • Don't press too hard!");
  Serial.println("  • Stay very still");
  Serial.println("  • Wait 5-10 seconds for reading");
  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("MONITORING...");
  Serial.println("════════════════════════════════════════");
  Serial.println();
}

void loop() {
  long irValue = particleSensor.getIR();

  // Check if finger is on sensor
  if (irValue < 50000) {
    // No finger detected
    Serial.println("⚠ No finger detected - place finger on sensor");
    beatsPerMinute = 0;
    beatAvg = 0;
    delay(1000);
    return;
  }

  // Finger is detected, check for heartbeat
  if (checkForBeat(irValue) == true) {
    // We detected a beat!
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    // Only consider realistic heart rates
    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute; // Store this reading
      rateSpot %= RATE_SIZE;                     // Wrap variable

      // Take average of readings
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) {
        beatAvg += rates[x];
      }
      beatAvg /= RATE_SIZE;

      // Print result
      Serial.println();
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      Serial.print("♥ HEARTBEAT! | ");
      Serial.print("IR: ");
      Serial.print(irValue);
      Serial.print(" | BPM: ");
      Serial.print(beatsPerMinute);
      Serial.print(" | Avg BPM: ");
      Serial.println(beatAvg);
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      Serial.println();
    }
  }

  // Print status every second
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 1000) {
    Serial.print("IR Signal: ");
    Serial.print(irValue);
    Serial.print(" | ");

    if (beatAvg > 0) {
      Serial.print("❤️ BPM: ");
      Serial.print(beatAvg);

      // Interpret BPM
      if (beatAvg < 60) {
        Serial.print(" (Low)");
      } else if (beatAvg > 100) {
        Serial.print(" (High)");
      } else {
        Serial.print(" (Normal)");
      }
    } else {
      Serial.print("Waiting for pulse...");
    }

    Serial.println();
    lastPrint = millis();
  }

  delay(20); // Don't hammer the I2C bus
}
