/*
 * MAX30102 + SSD1306 OLED — Average BPM Display
 *
 * Shows your average heart rate (BPM) on a 0.96" 128x64 OLED.
 * Both the sensor and the display sit on the SAME I2C bus (A4/A5):
 *   - MAX30102 at 0x57
 *   - SSD1306 OLED at 0x3C (change OLED_ADDR to 0x3D if your scanner shows that)
 *
 * LIBRARIES (install via Library Manager):
 *   - SparkFun MAX3010x
 *   - Adafruit SSD1306
 *   - Adafruit GFX
 *
 * WIRING (breadboard, shared I2C bus):
 *   Arduino 5V  -> MAX30102 VIN  + OLED VCC
 *   Arduino GND -> MAX30102 GND  + OLED GND
 *   Arduino A4  -> MAX30102 SDA  + OLED SDA
 *   Arduino A5  -> MAX30102 SCL  + OLED SCL
 *
 * BAUD: 115200
 *
 * Beat detection: heartbeats show up as brief DIPS in the IR signal
 * (~1% below a slow-moving baseline), tuned from real waveform data.
 */

#include <Wire.h>
#include "MAX30105.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---- OLED config ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET   -1      // share Arduino reset (no dedicated pin)
#define OLED_ADDR    0x3C    // change to 0x3D if the I2C scanner shows that
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

void resetState() {
  fingerPresent = false;
  inDip = false;
  baseline = 0;
  lastBeatTime = 0;
  beatCount = 0;
  beatAvg = 0;
  rateSpot = 0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("MAX30102 + OLED BPM Display"));

  // --- Sensor init ---
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {   // 400kHz I2C
    Serial.println(F("MAX30102 not found! Check wiring."));
    while (1);
  }
  particleSensor.setup(255, 4, 2, 100, 411, 16384);    // bright config
  particleSensor.setPulseAmplitudeGreen(0);

  // --- Display init ---
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("SSD1306 not found! Check OLED_ADDR / wiring."));
    while (1);
  }
  Wire.setClock(400000);   // fast I2C for both devices

  // Splash
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(18, 20);
  display.println(F("Heart Monitor"));
  display.setCursor(10, 36);
  display.println(F("Place finger..."));
  display.display();

  Serial.println(F("Ready. Place finger on sensor."));
}

void loop() {
  long ir = particleSensor.getIR();
  unsigned long now = millis();

  // ===== NO FINGER =====
  if (ir < 50000) {
    if (fingerPresent) {
      Serial.println(F("Finger removed."));
      resetState();
    }
    if (lastShownFinger || lastShownAvg != -1) {
      showWaiting();
      lastShownFinger = false;
      lastShownAvg = -1;
    }
    delay(50);
    return;
  }

  // ===== FINGER JUST PLACED =====
  if (!fingerPresent) {
    fingerPresent = true;
    baseline = ir;
    Serial.println(F("Finger detected. Measuring..."));
    showMeasuring();
    lastShownFinger = true;
  }

  // ===== UPDATE BASELINE (rise fast, fall slow) =====
  if (ir > baseline) baseline += (ir - baseline) * 0.10;
  else               baseline += (ir - baseline) * 0.005;

  float dipThreshold     = baseline * 0.99;    // beat = 1% dip
  float recoverThreshold = baseline * 0.995;

  // ===== DIP (BEAT) DETECTION =====
  if (!inDip && ir < dipThreshold) {
    inDip = true;
    unsigned long interval = now - lastBeatTime;

    if (lastBeatTime == 0 || interval > 2000) {
      lastBeatTime = now;                       // first beat: just mark time
    } else if (interval >= 300) {               // 300ms-2000ms = 30-200 BPM
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

        Serial.print(F("BEAT #"));
        Serial.print(beatCount);
        Serial.print(F(" | BPM: "));
        Serial.print(bpm);
        Serial.print(F(" | Avg: "));
        Serial.println(beatAvg);

        beatFlash = true;
        beatFlashTime = now;

        // Refresh the OLED whenever the average changes (or on first real avg)
        if (beatCount >= 2 && beatAvg != lastShownAvg) {
          showBPM(beatAvg);
          lastShownAvg = beatAvg;
        }
      }
    }
    // interval < 300ms = noise: ignore, don't reset timer
  } else if (inDip && ir > recoverThreshold) {
    inDip = false;
  }

  // Clear the beat-flash heart after 150ms without a full redraw storm
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

  // Small heart marker (filled when a beat just happened)
  if (beatFlash) {
    display.fillCircle(10, 12, 4, SSD1306_WHITE);
    display.fillCircle(17, 12, 4, SSD1306_WHITE);
    display.fillTriangle(5, 14, 22, 14, 13, 24, SSD1306_WHITE);
  }

  // Label
  display.setTextSize(1);
  display.setCursor(34, 6);
  display.println(F("Avg Heart Rate"));

  // Big number, roughly centered
  display.setTextSize(4);            // each digit ~24px wide
  int digits = (avg >= 100) ? 3 : (avg >= 10 ? 2 : 1);
  int numWidth = digits * 24;
  int x = (SCREEN_WIDTH - (numWidth + 6)) / 2;   // leave room; nudge left
  display.setCursor(x, 26);
  display.print(avg);

  // "BPM" label
  display.setTextSize(2);
  display.setCursor(x + numWidth + 4, 40);
  display.print(F("BPM"));

  // Status line
  display.setTextSize(1);
  display.setCursor(30, 56);
  if (avg < 60)       display.print(F("Low"));
  else if (avg > 100) display.print(F("Elevated"));
  else                display.print(F("Normal"));

  display.display();
}
