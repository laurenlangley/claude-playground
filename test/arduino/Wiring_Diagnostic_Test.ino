/*
 * WIRING DIAGNOSTIC TEST
 *
 * This tests each pin individually to find wiring problems
 */

const int PULSE_PIN = A0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║   WIRING DIAGNOSTIC TEST               ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();

  // Test A0 pin
  Serial.println("Testing A0 pin...");
  int reading1 = analogRead(A0);
  delay(100);
  int reading2 = analogRead(A0);
  delay(100);
  int reading3 = analogRead(A0);

  Serial.print("  Reading 1: "); Serial.println(reading1);
  Serial.print("  Reading 2: "); Serial.println(reading2);
  Serial.print("  Reading 3: "); Serial.println(reading3);
  Serial.println();

  if (reading1 == 0 && reading2 == 0 && reading3 == 0) {
    Serial.println("❌ PROBLEM: Pin A0 reads constant 0");
    Serial.println();
    Serial.println("Possible causes:");
    Serial.println("  1. Purple wire not connected to A0");
    Serial.println("  2. Purple wire is damaged");
    Serial.println("  3. Sensor is faulty");
    Serial.println();
    Serial.println("Try this:");
    Serial.println("  • Remove purple wire from A0");
    Serial.println("  • Firmly reinsert into A0");
    Serial.println("  • Try a different wire if available");
  } else if (reading1 == 1023 && reading2 == 1023 && reading3 == 1023) {
    Serial.println("❌ PROBLEM: Pin A0 reads constant 1023");
    Serial.println();
    Serial.println("This means pin is floating (not connected)");
    Serial.println("  • Check purple wire is in A0, not another pin");
  } else {
    Serial.println("✓ A0 pin is working and reading values!");
    Serial.println();
    Serial.println("Sensor should be working. Let me test more...");
  }

  Serial.println();
  Serial.println("═══════════════════════════════════════");
  Serial.println("CONTINUOUS MONITORING:");
  Serial.println("═══════════════════════════════════════");
}

void loop() {
  int value = analogRead(A0);

  Serial.print("A0 = ");
  Serial.print(value);
  Serial.print("  ");

  // Visual bar
  int bars = map(value, 0, 1023, 0, 50);
  for(int i = 0; i < bars; i++) {
    Serial.print("█");
  }
  Serial.println();

  delay(200);
}
