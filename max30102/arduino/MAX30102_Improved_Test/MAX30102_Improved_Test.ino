/*
 * MAX30102 IMPROVED TEST
 *
 * More robust beat detection that continuously monitors
 *
 * LIBRARY: SparkFun MAX3010x
 * WIRING: VIN→5V, GND→GND, SDA→A4, SCL→A5
 * BAUD: 115200
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

// Beat detection variables
long irValue = 0;
long lastIrValue = 0;
bool beatDetected = false;
long beatThreshold = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("MAX30102 Improved Test");
  Serial.println("Initializing...");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30102 not found!");
    while (1);
  }

  Serial.println("MAX30102 found!");

  // Configure sensor for better beat detection
  byte ledBrightness = 60;  // Options: 0=Off to 255=50mA
  byte sampleAverage = 4;   // Options: 1, 2, 4, 8, 16, 32
  byte ledMode = 2;         // Options: 1 = Red only, 2 = Red + IR
  byte sampleRate = 100;    // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411;     // Options: 69, 118, 215, 411
  int adcRange = 4096;      // Options: 2048, 4096, 8192, 16384

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("Sensor configured!");
  Serial.println("Place finger on sensor...");
  Serial.println();
}

void loop() {
  irValue = particleSensor.getIR();

  // Check if finger is detected
  if (irValue < 50000) {
    Serial.println("No finger - Place finger on sensor");
    beatsPerMinute = 0;
    beatAvg = 0;
    beatDetected = false;
    lastBeat = 0;
    beatThreshold = 0;
    delay(500);
    return;
  }

  // Auto-calibrate threshold based on signal
  if (beatThreshold == 0) {
    beatThreshold = irValue - 5000;  // Set threshold below baseline
  }

  // Simple beat detection - look for significant rise
  long irDelta = irValue - lastIrValue;

  if (irValue > beatThreshold + 1000 && irDelta > 100 && !beatDetected) {
    // Beat detected!
    beatDetected = true;

    long now = millis();
    long delta = now - lastBeat;

    if (lastBeat != 0 && delta > 300 && delta < 2000) {  // Valid beat timing
      beatsPerMinute = 60000.0 / delta;

      if (beatsPerMinute > 20 && beatsPerMinute < 200) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;

        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;

        Serial.println();
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.print("♥ BEAT! | BPM: ");
        Serial.print((int)beatsPerMinute);
        Serial.print(" | Avg: ");
        Serial.println(beatAvg);
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }
    }

    lastBeat = now;

  } else if (irValue < beatThreshold) {
    // End of beat
    beatDetected = false;
  }

  lastIrValue = irValue;

  // Print status every 2 seconds
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 2000) {
    Serial.print("IR: ");
    Serial.print(irValue);
    Serial.print(" | Threshold: ");
    Serial.print(beatThreshold);
    Serial.print(" | Delta: ");
    Serial.print(irValue - lastIrValue);

    if (beatAvg > 0) {
      Serial.print(" | ❤️ BPM: ");
      Serial.print(beatAvg);
    }

    Serial.println();
    lastPrint = millis();
  }

  delay(20);
}
