# Pulse Sensor Troubleshooting Guide

This guide helps you diagnose and fix common issues with pulse sensor projects.

## Table of Contents
- [No Data in Serial Monitor](#no-data-in-serial-monitor)
- [Erratic or Noisy Readings](#erratic-or-noisy-readings)
- [No Pulse Detected](#no-pulse-detected)
- [Unrealistic BPM Values](#unrealistic-bpm-values)
- [Processing Won't Connect](#processing-wont-connect)
- [Hardware Issues](#hardware-issues)

---

## No Data in Serial Monitor

### Symptoms
- Serial Monitor is blank
- No output when sketch is running

### Solutions

**Check Serial Connection**
```
1. Verify Serial Monitor is open (Tools > Serial Monitor)
2. Check baud rate matches code (usually 9600)
3. Ensure correct COM port is selected (Tools > Port)
4. Try closing and reopening Serial Monitor
```

**Verify Upload**
```
1. Check for "Done uploading" message
2. Look for RX/TX LEDs blinking on Arduino
3. Re-upload the sketch
```

**Test Basic Serial**
```arduino
void setup() {
  Serial.begin(9600);
  Serial.println("Test");
}

void loop() {
  Serial.println("Running...");
  delay(1000);
}
```
If this works, the issue is in your pulse sensor code.

---

## Erratic or Noisy Readings

### Symptoms
- Signal jumps wildly
- Values fluctuate between extremes
- Cannot get stable readings

### Solutions

**Check Wiring**
- Ensure all connections are secure
- Use shorter wires if possible
- Avoid running sensor wires parallel to power wires

**Sensor Placement**
```
✓ DO:
  - Place finger gently on sensor
  - Use fingertip or earlobe
  - Keep finger still
  - Ensure good skin contact

✗ DON'T:
  - Press too hard (restricts blood flow)
  - Move finger during reading
  - Use through clothing
  - Touch the electronics side
```

**Power Issues**
- Try using external 5V power supply
- Add a 0.1µF capacitor between VCC and GND near sensor
- Check if USB cable is high quality

**Software Filtering**
```arduino
// Add simple averaging
const int numReadings = 10;
int readings[numReadings];
int readIndex = 0;
int total = 0;
int average = 0;

void loop() {
  total = total - readings[readIndex];
  readings[readIndex] = analogRead(PULSE_SENSOR_PIN);
  total = total + readings[readIndex];
  readIndex = (readIndex + 1) % numReadings;
  average = total / numReadings;

  // Use 'average' instead of raw reading
}
```

---

## No Pulse Detected

### Symptoms
- Sensor reads data but no beats detected
- LED doesn't blink
- BPM stays at 0

### Solutions

**Adjust Threshold**
```arduino
// Method 1: Manual adjustment
int Threshold = 550;  // Try values between 400-700

// Method 2: Auto-calibration
void setup() {
  Serial.begin(9600);

  // Read baseline
  long total = 0;
  for(int i = 0; i < 100; i++) {
    total += analogRead(PULSE_SENSOR_PIN);
    delay(10);
  }
  int baseline = total / 100;
  Threshold = baseline + 50;  // Set threshold above baseline

  Serial.print("Auto-threshold: ");
  Serial.println(Threshold);
}
```

**Check Signal Range**
```arduino
void loop() {
  int signal = analogRead(PULSE_SENSOR_PIN);

  static int minVal = 1023;
  static int maxVal = 0;

  minVal = min(minVal, signal);
  maxVal = max(maxVal, signal);

  Serial.print("Range: ");
  Serial.print(minVal);
  Serial.print(" - ");
  Serial.println(maxVal);

  // Range should be > 50 for good readings
  // If range is < 20, sensor may not be working
}
```

**Sensor Contact**
- Warm up your finger first (cold fingers have poor blood flow)
- Try different fingers
- Relax (tension affects pulse)
- Wait 5-10 seconds for reading to stabilize

---

## Unrealistic BPM Values

### Symptoms
- BPM shows values like 300, 20, or changes rapidly
- BPM doesn't match actual heart rate

### Solutions

**Add BPM Filtering**
```arduino
int calculateBPM(unsigned long interval) {
  int bpm = 60000 / interval;

  // Filter unrealistic values
  if(bpm < 40 || bpm > 200) {
    return 0;  // Invalid
  }

  // Optional: smooth BPM changes
  static int lastBPM = 0;
  if(abs(bpm - lastBPM) > 30) {
    // Large change, average it
    bpm = (bpm + lastBPM) / 2;
  }
  lastBPM = bpm;

  return bpm;
}
```

**Debounce Pulse Detection**
```arduino
unsigned long lastBeatTime = 0;
const unsigned long REFRACTORY_PERIOD = 200;  // ms

if(signal > threshold && !pulseDetected) {
  unsigned long now = millis();

  // Ignore if too soon after last beat
  if(now - lastBeatTime > REFRACTORY_PERIOD) {
    pulseDetected = true;
    lastBeatTime = now;
    // Calculate BPM...
  }
}
```

---

## Processing Won't Connect

### Symptoms
- Processing sketch can't find serial port
- "Port is already in use" error
- "Port not found" error

### Solutions

**Find Correct Port**
```processing
void setup() {
  // List all ports
  printArray(Serial.list());

  // Common patterns:
  // Windows: "COM3", "COM4", etc.
  // Mac: "/dev/cu.usbserial-*" or "/dev/tty.usbmodem*"
  // Linux: "/dev/ttyACM0" or "/dev/ttyUSB0"
}
```

**Port Already in Use**
```
1. Close Arduino Serial Monitor
2. Close any other Serial programs
3. Restart Processing sketch
4. Try unplugging and replugging Arduino
```

**Permission Issues (Linux/Mac)**
```bash
# Linux - Add user to dialout group
sudo usermod -a -G dialout $USER
# Log out and back in

# Mac - Check System Preferences > Security & Privacy
```

**Auto-Detect Port**
```processing
void setup() {
  String[] ports = Serial.list();
  String arduinoPort = null;

  // Find port with "usbmodem" or "ttyACM" (Arduino pattern)
  for(String port : ports) {
    if(port.contains("usbmodem") || port.contains("ttyACM")) {
      arduinoPort = port;
      break;
    }
  }

  if(arduinoPort != null) {
    myPort = new Serial(this, arduinoPort, 9600);
  }
}
```

---

## Hardware Issues

### Check Sensor LED
Most pulse sensors have a small LED on the back that illuminates your finger.

**LED is OFF:**
- Check VCC connection
- Verify Arduino is powered
- Test with multimeter: VCC to GND should be ~5V

**LED is ON:**
- Good! Sensor has power
- Issue is likely in signal or software

### Verify Wiring
```
Pin Check:
┌─────────────┬────────────┐
│ Sensor Wire │ Arduino    │
├─────────────┼────────────┤
│ Red (VCC)   │ 5V         │
│ Black (GND) │ GND        │
│ Purple (S)  │ A0         │
└─────────────┴────────────┘
```

### Test with Multimeter
```
1. VCC to GND: Should read ~5V
2. Signal to GND: Should vary between 0-5V when finger placed
3. If no voltage variation, sensor may be defective
```

### Common Hardware Problems
- **Loose connections**: Re-seat all wires
- **Wrong pins**: Double-check pin numbers in code match hardware
- **Bad sensor**: Try a different pulse sensor if available
- **Insufficient power**: Use powered USB hub or external power

---

## Still Having Issues?

### Debug Checklist
- [ ] Uploaded the `PulseSensor_Debug.ino` sketch
- [ ] Verified wiring matches diagram
- [ ] Checked Serial Monitor shows output
- [ ] Tested sensor on different finger
- [ ] Reviewed auto-threshold value
- [ ] Signal range is > 50
- [ ] Tried different USB cable/port

### Get Help
When asking for help, provide:
1. Arduino board model
2. Pulse sensor model/brand
3. Complete sketch code
4. Serial Monitor output
5. Wiring photo
6. Description of what's not working

---

## Additional Resources

- [Pulse Sensor Official Site](https://pulsesensor.com/)
- [Arduino Analog Input Tutorial](https://www.arduino.cc/en/Tutorial/BuiltInExamples/AnalogInput)
- [Processing Serial Library](https://processing.org/reference/libraries/serial/)

---

*Last updated: 2025-12-22*
