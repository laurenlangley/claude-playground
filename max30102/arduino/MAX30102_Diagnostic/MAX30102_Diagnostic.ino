/*
 * MAX30102 DIAGNOSTIC VERSION
 *
 * Shows detailed information to debug why beats aren't detected
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("MAX30102 DIAGNOSTIC MODE");
  Serial.println("========================");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR: MAX30102 not found!");
    while (1);
  }

  Serial.println("Sensor found!");
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(60);  // Brighter LED
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println();
  Serial.println("Place finger on sensor...");
  Serial.println("Showing RAW VALUES every 500ms:");
  Serial.println();
}

void loop() {
  long irValue = particleSensor.getIR();
  long redValue = particleSensor.getRed();

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 500) {
    Serial.print("IR: ");
    Serial.print(irValue);
    Serial.print(" | RED: ");
    Serial.print(redValue);

    if (irValue < 50000) {
      Serial.println(" | ❌ NO FINGER");
    } else if (irValue < 100000) {
      Serial.println(" | ⚠️  WEAK SIGNAL");
    } else {
      Serial.println(" | ✓ GOOD SIGNAL");
    }

    lastPrint = millis();
  }

  delay(20);
}
