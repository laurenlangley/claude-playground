/*
 * PULSE SENSOR HARDWARE TEST
 *
 * This is a SIMPLE test to verify your Pulse Sensor hardware is working.
 * NO external libraries required!
 *
 * WIRING:
 * - Pulse Sensor RED wire    → Arduino 5V
 * - Pulse Sensor BLACK wire  → Arduino GND
 * - Pulse Sensor PURPLE wire → Arduino A0
 *
 * WHAT TO EXPECT:
 * 1. Open Serial Monitor at 115200 baud
 * 2. You'll see the raw sensor value (should be around 300-700)
 * 3. Place finger GENTLY on sensor
 * 4. LED on Pin 13 will blink with each heartbeat
 * 5. Serial Monitor will show "♥ BEAT!" when detected
 * 6. You'll see your BPM (Beats Per Minute)
 *
 * TROUBLESHOOTING:
 * - If signal is stuck at 0 or 1023: Check wiring
 * - If signal doesn't change with finger: Sensor may be faulty
 * - If no beats detected: Adjust THRESHOLD value below
 * - Press too hard: Signal will be bad
 * - Move finger: Signal will be noisy
 */

// ===== CONFIGURATION =====
const int PULSE_PIN = A0;          // Analog pin for pulse sensor
const int LED_PIN = 13;            // Built-in LED
const int THRESHOLD = 550;         // Adjust this if beats aren't detected (try 400-600)
const int SAMPLE_RATE = 20;        // Read sensor every 20ms (50Hz)

// ===== VARIABLES =====
int signal = 0;                    // Current sensor reading
int peak = 0;                      // Peak value in current pulse
int trough = 1023;                 // Trough value in current pulse
boolean isPulse = false;           // Are we currently in a pulse?
unsigned long lastBeatTime = 0;    // Time of last beat
int BPM = 0;                       // Beats per minute
int beatCount = 0;                 // Total beats detected

// Running average for signal smoothing
const int AVG_SIZE = 4;
int signalHistory[AVG_SIZE];
int historyIndex = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // Initialize signal history
  for (int i = 0; i < AVG_SIZE; i++) {
    signalHistory[i] = 512;
  }

  delay(1000);

  // Print header
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║   PULSE SENSOR HARDWARE TEST           ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  Serial.println("Configuration:");
  Serial.print("  Pulse Pin: A");
  Serial.println(PULSE_PIN);
  Serial.print("  Threshold: ");
  Serial.println(THRESHOLD);
  Serial.print("  Sample Rate: ");
  Serial.print(SAMPLE_RATE);
  Serial.println("ms");
  Serial.println();
  Serial.println("Instructions:");
  Serial.println("  1. Place finger GENTLY on sensor");
  Serial.println("  2. Don't press too hard");
  Serial.println("  3. Stay very still");
  Serial.println("  4. Wait 5-10 seconds");
  Serial.println();
  Serial.println("Starting in 3 seconds...");
  Serial.println();
  delay(3000);

  Serial.println("═══════════════════════════════════════");
  Serial.println("MONITORING... (format: Signal | Status)");
  Serial.println("═══════════════════════════════════════");
}

void loop() {
  // Read sensor
  int rawSignal = analogRead(PULSE_PIN);

  // Apply simple smoothing
  signalHistory[historyIndex] = rawSignal;
  historyIndex = (historyIndex + 1) % AVG_SIZE;

  int sum = 0;
  for (int i = 0; i < AVG_SIZE; i++) {
    sum += signalHistory[i];
  }
  signal = sum / AVG_SIZE;

  // Track peaks and troughs
  if (signal > peak) peak = signal;
  if (signal < trough) trough = signal;

  // Detect pulse (rising edge)
  if (signal > THRESHOLD && !isPulse) {
    // Start of pulse detected!
    isPulse = true;
    digitalWrite(LED_PIN, HIGH);

    unsigned long now = millis();

    // Calculate BPM if this isn't the first beat
    if (lastBeatTime != 0) {
      unsigned long timeBetweenBeats = now - lastBeatTime;

      // Only calculate BPM if timing seems reasonable (300ms to 2000ms between beats)
      // That's 30 BPM to 200 BPM
      if (timeBetweenBeats > 300 && timeBetweenBeats < 2000) {
        BPM = 60000 / timeBetweenBeats;
        beatCount++;

        // Print beat notification
        Serial.println();
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.print("♥ HEARTBEAT #");
        Serial.print(beatCount);
        Serial.print(" | BPM: ");
        Serial.print(BPM);
        Serial.print(" | Interval: ");
        Serial.print(timeBetweenBeats);
        Serial.println("ms");
        Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Serial.println();
      }
    }

    lastBeatTime = now;

  } else if (signal < THRESHOLD && isPulse) {
    // End of pulse
    isPulse = false;
    digitalWrite(LED_PIN, LOW);
  }

  // Print regular status every 500ms
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 500) {
    Serial.print("Signal: ");
    Serial.print(signal);
    Serial.print(" | Range: ");
    Serial.print(trough);
    Serial.print("-");
    Serial.print(peak);
    Serial.print(" | ");

    if (signal > THRESHOLD) {
      Serial.print("PULSE");
    } else {
      Serial.print("-----");
    }

    if (BPM > 0) {
      Serial.print(" | BPM: ");
      Serial.print(BPM);
    }

    Serial.println();

    lastPrint = millis();

    // Reset peak/trough every few seconds
    static int resetCounter = 0;
    resetCounter++;
    if (resetCounter > 10) {  // Reset every 5 seconds
      peak = signal;
      trough = signal;
      resetCounter = 0;
    }
  }

  // Check for sensor issues
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 5000) {  // Check every 5 seconds
    int range = peak - trough;

    Serial.println();
    if (range < 10) {
      Serial.println("⚠ WARNING: Very low signal variation!");
      Serial.println("  → Check sensor wiring");
      Serial.println("  → Make sure finger is on sensor");
      Serial.println("  → Check sensor LED is lit");
    } else if (range < 30) {
      Serial.println("⚠ WARNING: Weak signal");
      Serial.println("  → Try different finger");
      Serial.println("  → Ensure good contact");
      Serial.println("  → Don't press too hard");
    } else {
      Serial.println("✓ Signal strength looks good");
    }

    if (beatCount == 0 && millis() > 15000) {
      Serial.println("⚠ No beats detected yet");
      Serial.print("  → Current threshold: ");
      Serial.println(THRESHOLD);
      Serial.println("  → Try adjusting threshold (400-600)");
      Serial.println("  → Make sure you're staying still");
    }

    Serial.println();
    lastCheck = millis();
  }

  delay(SAMPLE_RATE);
}
