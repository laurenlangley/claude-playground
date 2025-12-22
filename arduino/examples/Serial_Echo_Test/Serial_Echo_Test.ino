/*
 * Serial Echo Test for Processing Visualizer
 *
 * This sketch sends TEST DATA to verify Processing communication works.
 * It simulates a heartbeat at 75 BPM with a sine wave pulse.
 *
 * If Processing displays this test data correctly, then your actual
 * Pulse Sensor Arduino code has the problem.
 *
 * Expected Result in Processing:
 * - Smooth sine wave in pulse window
 * - BPM showing 75
 * - IBI showing 800ms
 *
 * IMPORTANT: This must match Processing's expected baud rate!
 * Standard Pulse Sensor code uses 115200
 */

int pulsePin = A0;                 // Not used in test, but defined for reference
int blinkPin = 13;                 // Built-in LED

// Test data generation
int counter = 0;
int testBPM = 75;
int testIBI = 800;

void setup() {
  pinMode(blinkPin, OUTPUT);

  // CRITICAL: Match this to your Processing code's baud rate
  // Standard Pulse Sensor Processing code uses 115200
  Serial.begin(115200);

  delay(1000);
  Serial.println("=== Serial Echo Test Starting ===");
  Serial.println("This sends test data to Processing");
  Serial.println("You should see a smooth sine wave");
  Serial.println("=====================================");
  delay(1000);
}

void loop() {
  // Generate a fake sine wave signal (simulates heartbeat)
  int fakeSignal = 512 + (int)(100 * sin(counter * 0.1));

  // Send sensor value (Processing looks for 'S' + value)
  Serial.print('S');
  Serial.println(fakeSignal);

  // Every 800ms (simulating 75 BPM), send a "beat"
  if (counter % 40 == 0) {  // 40 * 20ms = 800ms
    // Send BPM (Processing looks for 'B' + value)
    Serial.print('B');
    Serial.println(testBPM);

    // Send IBI - Inter Beat Interval (Processing looks for 'Q' + value)
    Serial.print('Q');
    Serial.println(testIBI);

    // Blink LED to show "beat"
    digitalWrite(blinkPin, HIGH);
  } else if (counter % 40 == 5) {
    digitalWrite(blinkPin, LOW);
  }

  counter++;
  if (counter > 1000) counter = 0;  // Reset to prevent overflow

  delay(20);  // 20ms delay = 50Hz update rate
}
