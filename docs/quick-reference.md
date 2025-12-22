# Pulse Sensor Quick Reference

## Basic Wiring
```
Pulse Sensor → Arduino
─────────────────────
Red (VCC)    → 5V
Black (GND)  → GND
Purple (S)   → A0
```

## Minimal Arduino Code
```arduino
const int PULSE_PIN = A0;
const int LED_PIN = 13;
int signal;
int threshold = 550;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  signal = analogRead(PULSE_PIN);
  Serial.println(signal);

  if(signal > threshold) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  delay(10);
}
```

## Common Threshold Values
- **Resting finger**: 400-550
- **Active/pressed**: 600-750
- **No contact**: 200-400

## Typical Signal Values
- **Good contact**: 400-800 range
- **Poor contact**: < 50 range
- **No sensor**: 0 or 1023

## BPM Calculation
```arduino
unsigned long lastBeat = 0;
int BPM;

// On beat detection:
unsigned long now = millis();
unsigned long interval = now - lastBeat;
BPM = 60000 / interval;  // Convert to beats per minute
lastBeat = now;
```

## Processing Port Names
- **Windows**: `"COM3"`, `"COM4"`
- **Mac**: `"/dev/cu.usbserial-*"`, `"/dev/tty.usbmodem*"`
- **Linux**: `"/dev/ttyUSB0"`, `"/dev/ttyACM0"`

## Serial Formats

### Text Format (Human Readable)
```arduino
Serial.print("BPM: ");
Serial.println(bpm);
```

### CSV Format (Processing/Plotter)
```arduino
Serial.print(signal);
Serial.print(",");
Serial.print(threshold);
Serial.print(",");
Serial.println(bpm);
```

## Debugging Commands

### Arduino Serial Monitor
```
Tools > Serial Monitor
Set baud: 9600
Line ending: Newline
```

### Arduino Serial Plotter
```
Tools > Serial Plotter
Output: signal,threshold,bpm
Update rate: 50-100ms recommended
```

## Common Issues Quick Fix

| Problem | Quick Fix |
|---------|-----------|
| No data | Check baud rate (9600) |
| Noisy signal | Don't press too hard |
| No pulse detected | Adjust threshold (±100) |
| High BPM | Add 200ms refractory period |
| Low BPM | Check signal range > 50 |
| Processing won't connect | Close Arduino Serial Monitor |

## Sensor Placement

**Best Locations:**
1. Index fingertip ✓
2. Earlobe ✓
3. Thumb ✓

**Tips:**
- Don't press too hard
- Keep still for 5 seconds
- Warm fingers work better
- Relax your hand

## Typical Values Reference

```
Normal Resting BPM: 60-100
Athletic Resting BPM: 40-60
Maximum BPM: ~220 - age
Signal Range (good): 100-300
Signal Range (poor): < 50
```

## File Locations in This Repo

```
arduino/examples/
  ├── PulseSensor_Basic/          # Simple starter
  └── PulseSensor_Debug/          # Full diagnostics

processing/examples/
  ├── PulseSensor_Visualizer/     # Graphical display
  └── Serial_Monitor_Simple/      # Text output

docs/
  ├── troubleshooting.md          # Detailed help
  └── quick-reference.md          # This file
```
