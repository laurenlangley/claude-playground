/*
 * Pulse Sensor Threshold Finder
 *
 * This sketch helps you find the optimal threshold value for your sensor.
 * Use this to determine what value to set in your main pulse sensor code.
 *
 * How to use:
 * 1. Upload this sketch
 * 2. Open Serial Monitor (115200 baud)
 * 3. Follow the on-screen instructions
 * 4. The sketch will recommend a threshold value
 *
 * Wiring:
 * - Red (VCC) → 5V
 * - Black (GND) → GND
 * - Purple (Signal) → A0
 */

const int PULSE_PIN = A0;
const int LED_PIN = 13;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  delay(1000);

  Serial.println("╔═════════════════════════════════════════╗");
  Serial.println("║  PULSE SENSOR THRESHOLD FINDER          ║");
  Serial.println("╚═════════════════════════════════════════╝");
  Serial.println();
  Serial.println("This tool will help you find the optimal");
  Serial.println("threshold value for beat detection.");
  Serial.println();
  Serial.println("Starting calibration in 2 seconds...");
  Serial.println();

  delay(2000);
}

void loop() {
  // Phase 1: Measure idle/baseline (no finger)
  Serial.println("═══════════════════════════════════════");
  Serial.println("PHASE 1: BASELINE MEASUREMENT");
  Serial.println("═══════════════════════════════════════");
  Serial.println("REMOVE finger from sensor!");
  Serial.println("Measuring baseline in 3 seconds...");
  delay(3000);

  int idleMin = 1023;
  int idleMax = 0;
  long idleTotal = 0;
  int samples = 200;

  Serial.println("Sampling... (2 seconds)");
  for (int i = 0; i < samples; i++) {
    int value = analogRead(PULSE_PIN);
    idleMin = min(idleMin, value);
    idleMax = max(idleMax, value);
    idleTotal += value;
    delay(10);
  }

  int idleAvg = idleTotal / samples;
  int idleRange = idleMax - idleMin;

  Serial.println();
  Serial.println("--- BASELINE RESULTS ---");
  Serial.print("  Idle Average: "); Serial.println(idleAvg);
  Serial.print("  Idle Min:     "); Serial.println(idleMin);
  Serial.print("  Idle Max:     "); Serial.println(idleMax);
  Serial.print("  Idle Range:   "); Serial.println(idleRange);
  Serial.println();

  if (idleRange > 50) {
    Serial.println("⚠ WARNING: High noise in baseline!");
    Serial.println("  This could indicate:");
    Serial.println("  - Loose wiring");
    Serial.println("  - Power supply issue");
    Serial.println("  - Sensor still being touched");
  } else {
    Serial.println("✓ Baseline looks stable");
  }

  delay(2000);

  // Phase 2: Measure with finger
  Serial.println();
  Serial.println("═══════════════════════════════════════");
  Serial.println("PHASE 2: PULSE MEASUREMENT");
  Serial.println("═══════════════════════════════════════");
  Serial.println("PLACE finger gently on sensor!");
  Serial.println("Stay very still...");
  Serial.println("Measuring in 3 seconds...");
  delay(3000);

  int pulseMin = 1023;
  int pulseMax = 0;
  long pulseTotal = 0;

  Serial.println("Sampling... (10 seconds)");
  samples = 1000;  // 10 seconds worth

  for (int i = 0; i < samples; i++) {
    int value = analogRead(PULSE_PIN);
    pulseMin = min(pulseMin, value);
    pulseMax = max(pulseMax, value);
    pulseTotal += value;

    // Show progress every second
    if (i % 100 == 0) {
      Serial.print(".");
    }

    delay(10);
  }

  Serial.println();
  int pulseAvg = pulseTotal / samples;
  int pulseRange = pulseMax - pulseMin;
  int pulseAmplitude = pulseRange / 2;

  Serial.println();
  Serial.println("--- PULSE RESULTS ---");
  Serial.print("  Pulse Average: "); Serial.println(pulseAvg);
  Serial.print("  Pulse Min:     "); Serial.println(pulseMin);
  Serial.print("  Pulse Max:     "); Serial.println(pulseMax);
  Serial.print("  Pulse Range:   "); Serial.println(pulseRange);
  Serial.print("  Amplitude:     "); Serial.println(pulseAmplitude);
  Serial.println();

  // Calculate recommended threshold
  Serial.println("═══════════════════════════════════════");
  Serial.println("ANALYSIS & RECOMMENDATIONS");
  Serial.println("═══════════════════════════════════════");

  if (pulseRange < 30) {
    Serial.println("⚠ WARNING: Very low pulse signal!");
    Serial.println("  Possible issues:");
    Serial.println("  - Finger not making good contact");
    Serial.println("  - Pressing too hard");
    Serial.println("  - Sensor LED not lit");
    Serial.println("  - Faulty sensor");
    Serial.println();
    Serial.println("Try:");
    Serial.println("  1. Check sensor LED is on");
    Serial.println("  2. Use fingertip (not pad)");
    Serial.println("  3. Lighter pressure");
    Serial.println("  4. Different finger");
  } else {
    Serial.println("✓ Good pulse signal detected!");
    Serial.println();

    // Method 1: Midpoint between min and average
    int threshold1 = pulseMin + (pulseAvg - pulseMin) / 2;

    // Method 2: Average plus 25% of amplitude
    int threshold2 = pulseAvg + (pulseAmplitude / 4);

    // Method 3: Idle + safety margin
    int threshold3 = idleAvg + 50;

    // Recommended: use the middle approach
    int recommended = threshold1;

    Serial.println("THRESHOLD CALCULATIONS:");
    Serial.print("  Method 1 (min-to-avg midpoint): ");
    Serial.println(threshold1);
    Serial.print("  Method 2 (avg + 25% amplitude):  ");
    Serial.println(threshold2);
    Serial.print("  Method 3 (idle + 50):            ");
    Serial.println(threshold3);
    Serial.println();

    Serial.println("╔═══════════════════════════════════════╗");
    Serial.print("║  RECOMMENDED THRESHOLD: ");
    Serial.print(recommended);
    Serial.println("          ║");
    Serial.println("╚═══════════════════════════════════════╝");
    Serial.println();

    Serial.println("Update your Arduino code with:");
    Serial.print("  const int THRESHOLD = ");
    Serial.print(recommended);
    Serial.println(";");
  }

  Serial.println();
  Serial.println("═══════════════════════════════════════");
  Serial.println("LIVE MONITORING (30 seconds)");
  Serial.println("═══════════════════════════════════════");
  Serial.println("Keep finger on sensor...");
  Serial.println();

  int threshold = pulseMin + (pulseAvg - pulseMin) / 2;
  boolean pulseDetected = false;
  int beatCount = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < 30000) {  // 30 seconds
    int signal = analogRead(PULSE_PIN);

    // Simple beat detection
    if (signal > threshold && !pulseDetected) {
      pulseDetected = true;
      beatCount++;
      digitalWrite(LED_PIN, HIGH);

      Serial.print("♥ BEAT #");
      Serial.print(beatCount);
      Serial.print(" | Signal: ");
      Serial.print(signal);
      Serial.print(" | Threshold: ");
      Serial.println(threshold);

    } else if (signal < threshold && pulseDetected) {
      pulseDetected = false;
      digitalWrite(LED_PIN, LOW);
    }

    delay(10);
  }

  // Calculate BPM from beat count
  if (beatCount > 0) {
    int bpm = beatCount * 2;  // 30 seconds * 2 = 60 seconds
    Serial.println();
    Serial.println("═══════════════════════════════════════");
    Serial.print("Detected ");
    Serial.print(beatCount);
    Serial.print(" beats in 30 seconds");
    Serial.println();
    Serial.print("Estimated BPM: ");
    Serial.println(bpm);

    if (bpm < 40 || bpm > 200) {
      Serial.println("⚠ BPM seems unrealistic");
      Serial.println("  - Threshold may need adjustment");
      Serial.println("  - Or sensor contact is poor");
    } else {
      Serial.println("✓ BPM is in normal range!");
    }
  } else {
    Serial.println();
    Serial.println("⚠ No beats detected!");
    Serial.println("  Try adjusting threshold or sensor placement");
  }

  Serial.println("═══════════════════════════════════════");
  Serial.println();
  Serial.println("Test complete!");
  Serial.println("Restarting in 10 seconds...");
  Serial.println();

  delay(10000);
}
