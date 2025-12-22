/*
 * ABSOLUTE MINIMUM TEST
 *
 * Just reads A0 every second and prints it.
 * If this shows 0, the sensor is definitely faulty.
 */

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Reading A0 pin every second...");
  Serial.println("Should be 300-700 range if sensor works");
  Serial.println("If always 0, sensor is faulty");
  Serial.println();
}

void loop() {
  int value = analogRead(A0);

  Serial.print("A0 value: ");
  Serial.print(value);

  if (value == 0) {
    Serial.println("  ❌ ZERO - no signal");
  } else if (value == 1023) {
    Serial.println("  ⚠ MAX - floating pin");
  } else {
    Serial.println("  ✓ READING DATA!");
  }

  delay(1000);
}
