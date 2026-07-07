/*
 * MAX30102 + SSD1306 OLED — BPM + Live Pulse Waveform
 *
 * Top band:  average BPM number, "BPM" label, status, beat-flash heart.
 * Bottom:    live scrolling PPG waveform (heartbeats appear as upward spikes).
 *
 * Both devices share the I2C bus on A4/A5 (MAX30102 @ 0x57, OLED @ 0x3C).
 *
 * LIBRARIES: SparkFun MAX3010x, Adafruit SSD1306, Adafruit GFX
 * WIRING:  5V->VIN/VCC, GND->GND, A4->SDA(both), A5->SCL(both)
 * BAUD:    115200
 *
 * How the trace works:
 *   Heartbeats show up as brief DIPS in raw IR. We plot the INVERTED signal
 *   (waveMax - IR) so each beat becomes an upward spike rising from a baseline,
 *   like a classic pulse-ox trace. The vertical scale auto-adapts to your
 *   signal using a slow min/max envelope.
 */

#include <Wire.h>
#include "MAX30105.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---- OLED ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET   -1
#define OLED_ADDR    0x3C          // change to 0x3D if your scanner shows that
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---- Waveform layout ----
#define WAVE_TOP     20            // first pixel row of the waveform area
#define WAVE_BOTTOM  63            // last pixel row
#define WAVE_LEN     128           // one sample per horizontal pixel
uint8_t wave[WAVE_LEN];            // stored y-pixel for each column
int waveHead = 0;                  // index of the oldest sample

// ---- Sensor ----
MAX30105 particleSensor;

// ---- Beat detection (baseline dip, tuned to 1%) ----
float baseline = 0;
bool fingerPresent = false;
bool inDip = false;
unsigned long lastBeatTime = 0;

// ---- Display auto-scale envelope ----
float waveMax = 0;
float waveMin = 0;

// ---- BPM averaging ----
const byte RATE_SIZE = 4;
int rates[RATE_SIZE];
byte rateSpot = 0;
int beatCount = 0;
int beatAvg = 0;

// ---- Beat flash ----
bool beatFlash = false;
unsigned long beatFlashTime = 0;

// ---- Display refresh throttle ----
unsigned long lastDisplay = 0;
const unsigned long REFRESH_MS = 66;   // ~15 fps

void resetState() {
  fingerPresent = false;
  inDip = false;
  baseline = 0;
  lastBeatTime = 0;
  beatCount = 0;
  beatAvg = 0;
  rateSpot = 0;
  for (int i = 0; i < WAVE_LEN; i++) wave[i] = WAVE_BOTTOM;  // flatline
  waveHead = 0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("MAX30102 + OLED Waveform"));

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(F("MAX30102 not found! Check wiring."));
    while (1);
  }
  particleSensor.setup(255, 4, 2, 100, 411, 16384);
  particleSensor.setPulseAmplitudeGreen(0);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("SSD1306 not found! Check OLED_ADDR / wiring."));
    while (1);
  }
  Wire.setClock(400000);

  for (int i = 0; i < WAVE_LEN; i++) wave[i] = WAVE_BOTTOM;

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
    if (now - lastDisplay >= REFRESH_MS) {
      showWaiting();
      lastDisplay = now;
    }
    delay(30);
    return;
  }

  // ===== FINGER JUST PLACED =====
  if (!fingerPresent) {
    fingerPresent = true;
    baseline = ir;
    waveMax = ir;
    waveMin = ir - 1500;     // seed a plausible dip depth
    Serial.println(F("Finger detected. Measuring..."));
  }

  // ===== BEAT-DETECTION BASELINE (rise fast, fall slow) =====
  if (ir > baseline) baseline += (ir - baseline) * 0.10;
  else               baseline += (ir - baseline) * 0.005;

  float dipThreshold     = baseline * 0.99;
  float recoverThreshold = baseline * 0.995;

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
        Serial.print(F("BEAT | BPM: ")); Serial.print(bpm);
        Serial.print(F(" | Avg: ")); Serial.println(beatAvg);
        beatFlash = true;
        beatFlashTime = now;
      }
    }
  } else if (inDip && ir > recoverThreshold) {
    inDip = false;
  }

  // ===== DISPLAY AUTO-SCALE ENVELOPE (fast expand, slow contract) =====
  if (ir > waveMax) waveMax = ir; else waveMax -= (waveMax - ir) * 0.002;
  if (ir < waveMin) waveMin = ir; else waveMin += (ir - waveMin) * 0.002;
  float range = waveMax - waveMin;
  if (range < 300) range = 300;                     // guard against flat/zero

  // Inverted so a beat (dip in IR) spikes UP from the baseline at the bottom
  float v = waveMax - ir;                            // 0 at top of signal, big during dip
  int y = WAVE_BOTTOM - (int)(v * (WAVE_BOTTOM - WAVE_TOP) / range);
  if (y < WAVE_TOP) y = WAVE_TOP;
  if (y > WAVE_BOTTOM) y = WAVE_BOTTOM;

  // Push newest sample into the circular buffer
  wave[waveHead] = (uint8_t)y;
  waveHead = (waveHead + 1) % WAVE_LEN;

  // Clear the beat flash after 150ms
  if (beatFlash && now - beatFlashTime > 150) beatFlash = false;

  // ===== THROTTLED RENDER (~15 fps) =====
  if (now - lastDisplay >= REFRESH_MS) {
    renderScreen();
    lastDisplay = now;
  }

  delay(15);
}

// ---------- Rendering ----------

void renderScreen() {
  display.clearDisplay();

  // --- Top band: BPM number + label + status ---
  display.setTextSize(2);
  display.setCursor(0, 2);
  if (beatCount >= 2) display.print(beatAvg);
  else                display.print(F("--"));

  display.setTextSize(1);
  display.setCursor(40, 1);
  display.print(F("BPM"));

  display.setCursor(40, 10);
  if (beatCount < 2)       display.print(F("measuring"));
  else if (beatAvg < 60)   display.print(F("Low"));
  else if (beatAvg > 100)  display.print(F("Elevated"));
  else                     display.print(F("Normal"));

  // Beat-flash heart (top right)
  if (beatFlash) {
    display.fillCircle(116, 5, 3, SSD1306_WHITE);
    display.fillCircle(122, 5, 3, SSD1306_WHITE);
    display.fillTriangle(113, 7, 125, 7, 119, 13, SSD1306_WHITE);
  }

  // Separator
  display.drawFastHLine(0, 17, 128, SSD1306_WHITE);

  // --- Waveform: connect stored samples oldest -> newest, left -> right ---
  for (int x = 0; x < WAVE_LEN - 1; x++) {
    int i0 = (waveHead + x) % WAVE_LEN;
    int i1 = (waveHead + x + 1) % WAVE_LEN;
    display.drawLine(x, wave[i0], x + 1, wave[i1], SSD1306_WHITE);
  }

  display.display();
}

void showWaiting() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(18, 20);
  display.println(F("Heart Monitor"));
  display.setCursor(10, 36);
  display.println(F("Place finger..."));
  display.display();
}
