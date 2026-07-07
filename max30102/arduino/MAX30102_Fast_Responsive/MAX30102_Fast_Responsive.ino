/*
 * MAX30102 FAST & RESPONSIVE VERSION
 *
 * Features:
 * - Shows BPM after just 2 heartbeats (~5 seconds)
 * - Handles finger removal/replacement smoothly
 * - Auto-resets when finger removed
 * - Quick recalibration
 *
 * LIBRARY: SparkFun MAX3010x
 * WIRING: VIN→5V, GND→GND, SDA→A4, SCL→A5
 * BAUD: 115200
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

// Fast averaging - only 2 samples needed
const byte RATE_SIZE = 2;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg = 0;

// Beat detection
long irValue = 0;
long irBaseline = 0;
long irPeak = 0;
bool beatDetected = false;
bool fingerPresent = false;
unsigned long fingerRemovedTime = 0;
int beatCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  MAX30102 FAST & RESPONSIVE            ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("❌ MAX30102 not found!");
    Serial.println("Check wiring: VIN→5V, GND→GND, SDA→A4, SCL→A5");
    while (1);
  }

  // Optimized sensor settings for fast response
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("✓ Sensor ready!");
  Serial.println("✓ Fast mode - shows BPM after 2 beats (~5 sec)");
  Serial.println("✓ Remove and replace finger anytime");
  Serial.println();
  Serial.println("Place finger on sensor...");
  Serial.println("════════════════════════════════════════");
}

void loop() {
  irValue = particleSensor.getIR();

  // Check if finger is present
  if (irValue < 50000) {
    // No finger detected
    if (fingerPresent) {
      // Finger just removed
      Serial.println();
      Serial.println("👆 Finger removed - ready for next reading");
      Serial.println();
      fingerPresent = false;
      fingerRemovedTime = millis();

      // Reset for next session
      beatDetected = false;
      beatAvg = 0;
      beatCount = 0;
      irBaseline = 0;
      irPeak = 0;
      rateSpot = 0;
    }

    // Show waiting message every 2 seconds
    static unsigned long lastWaitMsg = 0;
    if (millis() - lastWaitMsg > 2000) {
      Serial.println("⏳ Waiting for finger...");
      lastWaitMsg = millis();
    }

    delay(100);
    return;
  }

  // Finger detected!
  if (!fingerPresent) {
    Serial.println();
    Serial.println("✓ Finger detected! Calibrating...");
    fingerPresent = true;
    irBaseline = irValue;
    irPeak = irValue;
    delay(500); // Brief stabilization
    Serial.println("✓ Ready! Detecting heartbeat...");
    Serial.println();
  }

  // Auto-calibrate baseline and peak
  if (irValue < irBaseline) irBaseline = irValue;
  if (irValue > irPeak) irPeak = irValue;

  // Calculate dynamic threshold (40% between baseline and peak)
  long threshold = irBaseline + ((irPeak - irBaseline) * 0.4);

  // Simple but effective beat detection
  if (irValue > threshold && !beatDetected) {
    // Rising edge - beat starting
    beatDetected = true;

    long now = millis();
    long delta = now - lastBeat;

    // Valid beat timing (300ms - 2000ms = 30-200 BPM)
    if (lastBeat > 0 && delta > 300 && delta < 2000) {
      beatsPerMinute = 60000.0 / delta;

      if (beatsPerMinute > 30 && beatsPerMinute < 200) {
        // Store this reading
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        beatCount++;

        // Calculate average (even if only 1 or 2 samples)
        int validSamples = min(beatCount, RATE_SIZE);
        beatAvg = 0;
        for (byte x = 0; x < validSamples; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= validSamples;

        // Show beat!
        Serial.print("♥ BEAT #");
        Serial.print(beatCount);
        Serial.print(" | BPM: ");
        Serial.print((int)beatsPerMinute);

        if (beatCount >= 2) {
          // Show average after 2 beats!
          Serial.print(" | Avg: ");
          Serial.print(beatAvg);
          Serial.print(" BPM");

          // Interpret
          if (beatAvg < 60) {
            Serial.print(" (Low)");
          } else if (beatAvg > 100) {
            Serial.print(" (Elevated)");
          } else {
            Serial.print(" (Normal)");
          }
        } else {
          Serial.print(" | Stabilizing...");
        }

        Serial.println();
      }
    }

    lastBeat = now;

  } else if (irValue < threshold - 1000 && beatDetected) {
    // Falling edge - beat ending
    beatDetected = false;
  }

  // Status update every 3 seconds
  static unsigned long lastStatus = 0;
  if (fingerPresent && millis() - lastStatus > 3000) {
    Serial.println();
    Serial.println("─────────────────────────────────────────");
    Serial.print("📊 Status | IR: ");
    Serial.print(irValue);
    Serial.print(" | Range: ");
    Serial.print(irBaseline);
    Serial.print("-");
    Serial.print(irPeak);

    if (beatAvg > 0) {
      Serial.print(" | 🫀 BPM: ");
      Serial.print(beatAvg);
    }

    Serial.print(" | Beats: ");
    Serial.print(beatCount);
    Serial.println();
    Serial.println("─────────────────────────────────────────");
    Serial.println();

    lastStatus = millis();
  }

  delay(20);
}
