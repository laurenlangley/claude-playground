/*
 * MAX30102 WAVEFORM VIEWER
 *
 * Shows the actual signal values so we can see heartbeats
 * Helps debug why beats aren't being detected
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

long irValues[10];
int valueIndex = 0;
long minIR = 999999;
long maxIR = 0;
int beatCount = 0;
long lastBeatTime = 0;
int bpm = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("MAX30102 WAVEFORM VIEWER");
  Serial.println("========================");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR: Sensor not found!");
    while (1);
  }

  // Max brightness
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0xFF);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("Showing live waveform...");
  Serial.println("Look for pattern of PEAKS and VALLEYS");
  Serial.println();

  delay(1000);
}

void loop() {
  long irValue = particleSensor.getIR();

  // Store recent values
  irValues[valueIndex] = irValue;
  valueIndex = (valueIndex + 1) % 10;

  // Track min/max over last 10 readings
  minIR = 999999;
  maxIR = 0;
  for (int i = 0; i < 10; i++) {
    if (irValues[i] < minIR) minIR = irValues[i];
    if (irValues[i] > maxIR) maxIR = irValues[i];
  }

  long range = maxIR - minIR;
  long threshold = minIR + (range / 2);

  // Simple beat detection - look for peaks
  static long lastIR = 0;
  static bool wasPeak = false;

  // Detect if we're at a peak (value higher than threshold and higher than last value)
  bool isPeak = (irValue > threshold) && (irValue > lastIR + 100);

  if (isPeak && !wasPeak) {
    // New beat detected!
    long now = millis();
    long interval = now - lastBeatTime;

    if (interval > 300 && interval < 2000) {  // Valid beat timing
      bpm = 60000 / interval;
      beatCount++;

      Serial.println();
      Serial.print("♥♥♥ BEAT #");
      Serial.print(beatCount);
      Serial.print(" | BPM: ");
      Serial.print(bpm);
      Serial.println(" ♥♥♥");
      Serial.println();
    }

    lastBeatTime = now;
    wasPeak = true;
  } else if (irValue < threshold) {
    wasPeak = false;
  }

  lastIR = irValue;

  // Print waveform every 50ms
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 50) {
    // Show IR value with visual bar
    Serial.print("IR: ");
    Serial.print(irValue);
    Serial.print(" | ");

    // Show signal strength bar
    int bars = map(irValue, minIR, maxIR, 0, 50);
    for (int i = 0; i < bars; i++) {
      Serial.print("█");
    }

    // Show if above/below threshold
    if (irValue > threshold) {
      Serial.print(" ▲");  // Above threshold (potential beat)
    } else {
      Serial.print(" ▼");  // Below threshold
    }

    // Show range
    Serial.print(" [");
    Serial.print(minIR);
    Serial.print("-");
    Serial.print(maxIR);
    Serial.print("] Range:");
    Serial.print(range);

    if (bpm > 0) {
      Serial.print(" | BPM:");
      Serial.print(bpm);
    }

    Serial.println();

    lastPrint = millis();
  }

  delay(20);
}
