/*
 * I2C SCANNER
 *
 * This scans the I2C bus and shows what devices are connected.
 * The MAX30102 should appear at address 0x57
 *
 * WIRING:
 * MAX30102 VIN → Arduino 5V
 * MAX30102 GND → Arduino GND
 * MAX30102 SDA → Arduino A4
 * MAX30102 SCL → Arduino A5
 *
 * Serial Monitor: 115200 baud
 */

#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(115200);

  delay(2000);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║   I2C DEVICE SCANNER                   ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("Scanning I2C bus...");
  Serial.println();
}

void loop() {
  byte error, address;
  int devices = 0;

  Serial.println("Scanning...");
  Serial.println();

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("✓ Device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);

      // Identify known devices
      if (address == 0x57) {
        Serial.print("  ← MAX30102 HEART RATE SENSOR!");
      } else if (address == 0x68) {
        Serial.print("  ← MPU6050 or DS1307 RTC");
      } else if (address == 0x76 || address == 0x77) {
        Serial.print("  ← BMP280 or BME280");
      }

      Serial.println();
      devices++;
    }
  }

  Serial.println();

  if (devices == 0) {
    Serial.println("❌ NO I2C DEVICES FOUND!");
    Serial.println();
    Serial.println("Check:");
    Serial.println("  • SDA wire connected to A4");
    Serial.println("  • SCL wire connected to A5");
    Serial.println("  • VIN wire connected to 5V");
    Serial.println("  • GND wire connected to GND");
    Serial.println("  • Wires are firmly inserted");
    Serial.println();
  } else {
    Serial.print("✓ Found ");
    Serial.print(devices);
    Serial.println(" device(s)");
    Serial.println();

    if (devices > 0) {
      // Check specifically for MAX30102
      Wire.beginTransmission(0x57);
      error = Wire.endTransmission();

      if (error == 0) {
        Serial.println("╔════════════════════════════════════════╗");
        Serial.println("║  ✓ MAX30102 DETECTED!                  ║");
        Serial.println("╚════════════════════════════════════════╝");
        Serial.println();
        Serial.println("Your sensor is connected correctly!");
        Serial.println("Next step: Upload MAX30102_Quick_Test");
      } else {
        Serial.println("⚠ Device found but it's not a MAX30102");
        Serial.println("  Expected address: 0x57");
      }
    }
  }

  Serial.println("════════════════════════════════════════");
  Serial.println();
  Serial.println("Scanning again in 5 seconds...");
  Serial.println();

  delay(5000);
}
