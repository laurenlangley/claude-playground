/*
 * Pulse Sensor Advanced Debugging
 *
 * This sketch provides detailed diagnostics for troubleshooting pulse sensor issues
 * Outputs formatted data for both Serial Monitor and Serial Plotter
 *
 * Hardware Setup:
 * - Pulse Sensor Red wire (VCC) -> Arduino 5V
 * - Pulse Sensor Black wire (GND) -> Arduino GND
 * - Pulse Sensor Purple wire (Signal) -> Arduino A0
 *
 * Serial Monitor: Set to 9600 baud
 * Serial Plotter: Tools > Serial Plotter (for visual debugging)
 */

// Pin Configuration
const int PULSE_SENSOR_PIN = A0;
const int LED_PIN = 13;

// Sensor Readings
int Signal = 0;
int minSignal = 1023;
int maxSignal = 0;
int avgSignal = 0;

// Pulse Detection
int Threshold = 550;
boolean pulseDetected = false;
int BPM = 0;
unsigned long lastBeatTime = 0;
int beatCount = 0;

// Statistics
unsigned long startTime;
boolean sensorConnected = false;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);

  startTime = millis();

  Serial.println("╔═══════════════════════════════════╗");
  Serial.println("║  PULSE SENSOR DIAGNOSTIC MODE     ║");
  Serial.println("╚═══════════════════════════════════╝");
  Serial.println();
  Serial.println("Starting diagnostics in 2 seconds...");
  delay(2000);

  runDiagnostics();
}

void loop() {
  // Read sensor
  Signal = analogRead(PULSE_SENSOR_PIN);

  // Update statistics
  updateStatistics();

  // Check sensor connection
  checkSensorConnection();

  // Detect pulse
  detectPulse();

  // Output data
  static unsigned long lastOutput = 0;
  if (millis() - lastOutput > 20) {  // 50Hz update rate
    outputData();
    lastOutput = millis();
  }

  delay(10);
}

void runDiagnostics() {
  Serial.println("╔═══════════════════════════════════╗");
  Serial.println("║  SYSTEM CHECK                     ║");
  Serial.println("╚═══════════════════════════════════╝");

  // Check power
  Serial.print("✓ Arduino powered on\n");

  // Read initial sensor values
  Serial.print("✓ Sensor pin A");
  Serial.print(PULSE_SENSOR_PIN);
  Serial.println(" configured");

  // Sample sensor data
  Serial.println("\nSampling sensor (2 seconds)...");
  int samples = 0;
  long total = 0;
  int sampleMin = 1023;
  int sampleMax = 0;

  for (int i = 0; i < 200; i++) {
    int reading = analogRead(PULSE_SENSOR_PIN);
    total += reading;
    sampleMin = min(sampleMin, reading);
    sampleMax = max(sampleMax, reading);
    samples++;
    delay(10);
  }

  int average = total / samples;

  Serial.println("\n--- Sensor Readings ---");
  Serial.print("  Min: "); Serial.println(sampleMin);
  Serial.print("  Max: "); Serial.println(sampleMax);
  Serial.print("  Avg: "); Serial.println(average);
  Serial.print("  Range: "); Serial.println(sampleMax - sampleMin);

  Serial.println("\n--- Diagnosis ---");

  if (sampleMin == 0 && sampleMax == 0) {
    Serial.println("  ⚠ WARNING: No signal detected!");
    Serial.println("  Check wiring and power connections.");
  } else if (sampleMax - sampleMin < 20) {
    Serial.println("  ⚠ WARNING: Very low signal variation!");
    Serial.println("  Sensor may not be connected properly.");
    Serial.println("  Or finger is not on sensor.");
  } else {
    Serial.println("  ✓ Sensor appears to be working!");
    Serial.println("  Place finger firmly on sensor...");
    sensorConnected = true;
  }

  // Auto-adjust threshold
  Threshold = average + (sampleMax - sampleMin) / 4;
  Serial.print("\n  Auto-adjusted threshold: ");
  Serial.println(Threshold);

  Serial.println("\n╔═══════════════════════════════════╗");
  Serial.println("║  STARTING MONITORING...           ║");
  Serial.println("╚═══════════════════════════════════╝\n");

  delay(1000);
}

void updateStatistics() {
  minSignal = min(minSignal, Signal);
  maxSignal = max(maxSignal, Signal);

  // Simple running average (approximate)
  static long total = 0;
  static int count = 0;
  total += Signal;
  count++;
  if (count >= 100) {
    avgSignal = total / count;
    total = 0;
    count = 0;
  }
}

void checkSensorConnection() {
  // Reset min/max every 5 seconds
  static unsigned long lastReset = 0;
  if (millis() - lastReset > 5000) {
    int range = maxSignal - minSignal;

    if (range < 10) {
      sensorConnected = false;
    } else {
      sensorConnected = true;
    }

    minSignal = 1023;
    maxSignal = 0;
    lastReset = millis();
  }
}

void detectPulse() {
  if (Signal > Threshold && !pulseDetected) {
    pulseDetected = true;
    digitalWrite(LED_PIN, HIGH);

    unsigned long currentTime = millis();
    if (lastBeatTime != 0) {
      unsigned long interval = currentTime - lastBeatTime;
      BPM = 60000 / interval;

      // Filter unrealistic values
      if (BPM < 40 || BPM > 200) {
        BPM = 0;
      } else {
        beatCount++;
      }
    }
    lastBeatTime = currentTime;

  } else if (Signal < Threshold && pulseDetected) {
    pulseDetected = false;
    digitalWrite(LED_PIN, LOW);
  }
}

void outputData() {
  // Format for Serial Plotter: Signal, Threshold, BPM_scaled
  // BPM is scaled up so it's visible on the same graph
  Serial.print(Signal);
  Serial.print(",");
  Serial.print(Threshold);
  Serial.print(",");
  Serial.print(BPM * 5);  // Scale BPM for visibility
  Serial.print(",");
  Serial.println(sensorConnected ? 100 : 0);

  // Verbose output every 2 seconds
  static unsigned long lastVerbose = 0;
  if (millis() - lastVerbose > 2000) {
    unsigned long uptime = (millis() - startTime) / 1000;

    Serial.println("\n--- Status ---");
    Serial.print("Uptime: "); Serial.print(uptime); Serial.println("s");
    Serial.print("Sensor: "); Serial.println(sensorConnected ? "CONNECTED" : "DISCONNECTED");
    Serial.print("Signal: "); Serial.print(Signal);
    Serial.print(" (Range: "); Serial.print(minSignal);
    Serial.print("-"); Serial.print(maxSignal); Serial.println(")");

    if (BPM > 0) {
      Serial.print("BPM: "); Serial.print(BPM);
      Serial.print(" | Total beats: "); Serial.println(beatCount);
    } else {
      Serial.println("BPM: -- (waiting for stable pulse)");
    }
    Serial.println();

    lastVerbose = millis();
  }
}
