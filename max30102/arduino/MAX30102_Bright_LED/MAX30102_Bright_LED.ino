/*
 * MAX30102 MAXIMUM BRIGHTNESS TEST
 *
 * Uses maximum LED brightness for better signal
 */

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 particleSensor;

const byte RATE_SIZE = 2;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

void setup() {
  Serial.begin(115200);
  Serial.println("MAX30102 - MAXIMUM BRIGHTNESS MODE");
  Serial.println("===================================");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR: Sensor not found!");
    while (1);
  }

  Serial.println("Sensor found!");
  Serial.println("Configuring with MAX brightness...");

  // Maximum brightness configuration
  byte ledBrightness = 255;   // MAX brightness (was 60)
  byte sampleAverage = 4;
  byte ledMode = 2;
  byte sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 16384;       // MAX range

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0xFF);  // MAX red LED
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("Ready! Place finger on sensor...");
  Serial.println();
}

void loop() {
  long irValue = particleSensor.getIR();

  // Status every second
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 1000) {
    Serial.print("IR: ");
    Serial.print(irValue);
    Serial.print(" | ");

    if (irValue < 50000) {
      Serial.println("NO FINGER");
    } else if (irValue < 100000) {
      Serial.println("WEAK - Press firmer or try 3.3V");
    } else if (irValue < 200000) {
      Serial.println("GOOD - Detecting...");
    } else {
      Serial.println("EXCELLENT - Detecting...");
    }

    lastStatus = millis();
  }

  // Beat detection
  if (irValue > 100000) {  // Only detect if signal is good enough
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();

      beatsPerMinute = 60 / (delta / 1000.0);

      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;

        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;

        Serial.println();
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.print("♥ BPM: ");
        Serial.print((int)beatsPerMinute);
        Serial.print(" | Avg: ");
        Serial.println(beatAvg);
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━");
      }
    }
  }

  delay(20);
}
