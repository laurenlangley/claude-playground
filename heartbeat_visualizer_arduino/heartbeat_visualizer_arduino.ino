/*
 * MAX30102 + Serial Output for Web Visualizer
 *
 * Streams IR sensor data and BPM calculations to serial port
 * for real-time web visualization.
 *
 * Data format sent over serial:
 *   W,<ir_value>          - Waveform data point
 *   B,<bpm>               - Beat detected with BPM
 *   A,<avg_bpm>           - Average BPM update
 *
 * LIBRARIES: SparkFun MAX3010x, Adafruit SSD1306, Adafruit GFX
 * BAUD: 115200
 */

#include <Wire.h>
#include "MAX30105.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---- OLED config ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET   -1
#define OLED_ADDR    0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---- Sensor ----
MAX30105 particleSensor;

// ---- Baseline / dip detection ----
float baseline = 0;
bool fingerPresent = false;
bool inDip = false;
unsigned long lastBeatTime = 0;

// ---- BPM averaging ----
const byte RATE_SIZE = 4;
int rates[RATE_SIZE];
byte rateSpot = 0;
int beatCount = 0;
int beatAvg = 0;

// ---- Display refresh control ----
int lastShownAvg = -1;
bool lastShownFinger = false;
bool beatFlash = false;
unsigned long beatFlashTime = 0;

// ---- Serial streaming ----
unsigned long lastStreamTime = 0;
const int STREAM_INTERVAL = 20;  // Send data every 20ms (50 Hz)

void resetState() {
  fingerPresent = false;
  inDip = false;
  baseline = 0;
  lastBeatTime = 0;
  beatCount = 0;
  beatAvg = 0;
  rateSpot = 0;
  Serial.println("F,0");  // Finger removed
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // --- Sensor init ---
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR: MAX30102 not found");
    while (1);
  }
  particleSensor.setup(255, 4, 2, 100, 411, 16384);
  particleSensor.setPulseAmplitudeGreen(0);

  // --- Display init ---
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("ERROR: SSD1306 not found");
    while (1);
  }
  Wire.setClock(400000);

  // Splash
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(18, 20);
  display.println(F("Heart Monitor"));
  display.setCursor(10, 36);
  display.println(F("Place finger..."));
  display.display();

  Serial.println("READY");
}

void loop() {
  long ir = particleSensor.getIR();
  unsigned long now = millis();

  // Stream IR waveform data at regular intervals
  if (now - lastStreamTime >= STREAM_INTERVAL) {
    // Normalize IR value to 0-255 range for visualization
    // MAX30102 IR typically ranges from 0 to ~200000
    int normalizedIR = constrain(map(ir, 0, 200000, 0, 255), 0, 255);
    Serial.print("W,");
    Serial.println(normalizedIR);
    lastStreamTime = now;
  }

  // ===== NO FINGER =====
  if (ir < 50000) {
    if (fingerPresent) {
      resetState();
    }
    if (lastShownFinger || lastShownAvg != -1) {
      showWaiting();
      lastShownFinger = false;
      lastShownAvg = -1;
    }
    delay(20);
    return;
  }

  // ===== FINGER JUST PLACED =====
  if (!fingerPresent) {
    fingerPresent = true;
    baseline = ir;
    Serial.println("F,1");  // Finger detected
    showMeasuring();
    lastShownFinger = true;
  }

  // ===== UPDATE BASELINE =====
  if (ir > baseline) baseline += (ir - baseline) * 0.10;
  else               baseline += (ir - baseline) * 0.005;

  float dipThreshold     = baseline * 0.99;
  float recoverThreshold = baseline * 0.995;

  // ===== DIP (BEAT) DETECTION =====
  if (!inDip && ir < dipThreshold) {
    inDip = true;
    unsigned long interval = now - lastBeatTime;

    if (lastBeatTime == 0 || interval > 2000) {
      lastBeatTime = now;
    } else if (interval >= 300) {
      int bpm = 60000 / interval;
      lastBeatTime = now;
      if (bpm >= 35 && bpm <= 190) {
        rates[rateSpot++] = bpm;
        rateSpot %= RATE_SIZE;
        beatCount++;

        int n = min(beatCount, (int)RATE_SIZE);
        long sum = 0;
        for (int i = 0; i < n; i++) sum += rates[i];
        beatAvg = sum / n;

        // Send beat event with instant BPM
        Serial.print("B,");
        Serial.println(bpm);

        // Send average BPM update
        if (beatCount >= 2) {
          Serial.print("A,");
          Serial.println(beatAvg);
        }

        beatFlash = true;
        beatFlashTime = now;

        if (beatCount >= 2 && beatAvg != lastShownAvg) {
          showBPM(beatAvg);
          lastShownAvg = beatAvg;
        }
      }
    }
  } else if (inDip && ir > recoverThreshold) {
    inDip = false;
  }

  // Clear beat flash
  if (beatFlash && now - beatFlashTime > 150) {
    beatFlash = false;
    if (lastShownAvg >= 0) showBPM(lastShownAvg);
  }

  delay(20);
}

// ---------- Display helpers ----------

void showWaiting() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(18, 20);
  display.println(F("Heart Monitor"));
  display.setCursor(10, 36);
  display.println(F("Place finger..."));
  display.display();
}

void showMeasuring() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(30, 12);
  display.println(F("Measuring"));
  display.setCursor(46, 30);
  display.println(F("..."));
  display.display();
}

void showBPM(int avg) {
  display.clearDisplay();

  if (beatFlash) {
    display.fillCircle(10, 12, 4, SSD1306_WHITE);
    display.fillCircle(17, 12, 4, SSD1306_WHITE);
    display.fillTriangle(5, 14, 22, 14, 13, 24, SSD1306_WHITE);
  }

  display.setTextSize(1);
  display.setCursor(34, 6);
  display.println(F("Avg Heart Rate"));

  display.setTextSize(4);
  int digits = (avg >= 100) ? 3 : (avg >= 10 ? 2 : 1);
  int numWidth = digits * 24;
  int x = (SCREEN_WIDTH - (numWidth + 6)) / 2;
  display.setCursor(x, 26);
  display.print(avg);

  display.setTextSize(2);
  display.setCursor(x + numWidth + 4, 40);
  display.print(F("BPM"));

  display.setTextSize(1);
  display.setCursor(30, 56);
  if (avg < 60)       display.print(F("Low"));
  else if (avg > 100) display.print(F("Elevated"));
  else                display.print(F("Normal"));

  display.display();
}
