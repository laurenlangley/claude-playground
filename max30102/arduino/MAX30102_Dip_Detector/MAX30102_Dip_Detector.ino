/*
 * MAX30102 DIP DETECTOR - Detects heartbeats as signal DIPS
 *
 * Discovery: On this sensor/finger combo, heartbeats appear as brief
 * DIPS in the IR signal (long bars -> 2-3 short bars -> long bars).
 * Previous sketches looked for PEAKS, which is why they failed.
 *
 * This version:
 * - Tracks a slow-moving baseline of the signal
 * - Detects a beat when signal dips 3% below baseline
 * - Handles finger removal/replacement automatically
 * - Shows average BPM after 2 beats
 *
 * LIBRARY: SparkFun MAX3010x
 * WIRING: VIN -> 5V, GND -> GND, SDA -> A4, SCL -> A5
 * BAUD: 115200
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

// Baseline tracking (exponential moving average)
float baseline = 0;

// State
bool fingerPresent = false;
bool inDip = false;
unsigned long lastBeatTime = 0;

// BPM averaging
const byte RATE_SIZE = 4;
int rates[RATE_SIZE];
byte rateSpot = 0;
int beatCount = 0;
int beatAvg = 0;

void resetState() {
  fingerPresent = false;
  inDip = false;
  baseline = 0;
  lastBeatTime = 0;
  beatCount = 0;
  beatAvg = 0;
  rateSpot = 0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  MAX30102 DIP DETECTOR                 ║");
  Serial.println("║  (detects beats as signal dips)        ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("❌ MAX30102 not found! Check wiring.");
    while (1);
  }

  // Same high-brightness config that gave you IR > 200,000
  byte ledBrightness = 255;
  byte sampleAverage = 4;
  byte ledMode = 2;
  byte sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 16384;

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("✓ Sensor ready!");
  Serial.println("Place finger on sensor...");
  Serial.println();
}

void loop() {
  long ir = particleSensor.getIR();
  unsigned long now = millis();

  // ===== FINGER REMOVED =====
  if (ir < 50000) {
    if (fingerPresent) {
      Serial.println();
      Serial.println("👆 Finger removed - ready for next reading");
      Serial.println();
      resetState();
    }

    static unsigned long lastWaitMsg = 0;
    if (now - lastWaitMsg > 2000) {
      Serial.println("⏳ Waiting for finger...");
      lastWaitMsg = now;
    }

    delay(50);
    return;
  }

  // ===== FINGER JUST PLACED =====
  if (!fingerPresent) {
    fingerPresent = true;
    baseline = ir;  // start baseline at current reading
    Serial.println("✓ Finger detected! Watching for dips...");
    Serial.println();
  }

  // ===== UPDATE BASELINE =====
  // Rise quickly toward higher values, fall slowly.
  // This keeps the baseline at the "top" of the signal so dips stand out.
  if (ir > baseline) {
    baseline += (ir - baseline) * 0.10;
  } else {
    baseline += (ir - baseline) * 0.005;
  }

  // Beat = dip 3% below baseline. Recover = back within 1%.
  float dipThreshold = baseline * 0.97;
  float recoverThreshold = baseline * 0.99;

  // ===== DIP (BEAT) DETECTION =====
  if (!inDip && ir < dipThreshold) {
    inDip = true;  // dip started = heartbeat!

    unsigned long interval = now - lastBeatTime;

    if (lastBeatTime == 0 || interval > 2000) {
      // First beat (or long gap) - just mark the time
      lastBeatTime = now;
      Serial.println("♥ First beat detected - measuring...");
    } else if (interval >= 300) {
      // Valid beat timing (300ms-2000ms = 30-200 BPM)
      int bpm = 60000 / interval;
      lastBeatTime = now;

      if (bpm >= 35 && bpm <= 190) {
        rates[rateSpot++] = bpm;
        rateSpot %= RATE_SIZE;
        beatCount++;

        // Average over available samples (up to RATE_SIZE)
        int n = min(beatCount, (int)RATE_SIZE);
        long sum = 0;
        for (int i = 0; i < n; i++) sum += rates[i];
        beatAvg = sum / n;

        Serial.print("♥ BEAT #");
        Serial.print(beatCount);
        Serial.print(" | BPM: ");
        Serial.print(bpm);

        if (beatCount >= 2) {
          Serial.print(" | Avg: ");
          Serial.print(beatAvg);
          if (beatAvg < 60)       Serial.print(" (Low)");
          else if (beatAvg > 100) Serial.print(" (Elevated)");
          else                    Serial.print(" (Normal)");
        }
        Serial.println();
      }
    }
    // interval < 300ms = noise: ignore it, DON'T reset the timer

  } else if (inDip && ir > recoverThreshold) {
    inDip = false;  // signal recovered, ready for next dip
  }

  // ===== STATUS EVERY 3 SECONDS =====
  static unsigned long lastStatus = 0;
  if (now - lastStatus > 3000) {
    Serial.print("📊 IR: ");
    Serial.print(ir);
    Serial.print(" | Baseline: ");
    Serial.print((long)baseline);
    if (beatAvg > 0) {
      Serial.print(" | 🫀 Avg BPM: ");
      Serial.print(beatAvg);
      Serial.print(" | Beats: ");
      Serial.print(beatCount);
    }
    Serial.println();
    lastStatus = now;
  }

  delay(20);
}
