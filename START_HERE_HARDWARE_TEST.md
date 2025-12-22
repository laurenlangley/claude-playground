# 🎯 START HERE - Test Your Pulse Sensor Hardware

I've created a **NEW BRANCH** with simple hardware test code. This will definitively show if your Pulse Sensor is working!

## 📍 Current Branch

You're now on: **`claude/pulse-sensor-hardware-test-xyeeH`**

This branch has **simple test code** that works independently from the complex visualizer.

---

## ⚡ Quick Start - 2 Minute Test

### Test 1: Arduino Only (FASTEST)

1. **Open:** `test/arduino/Pulse_Sensor_Hardware_Test.ino`
2. **Upload** to Arduino Uno
3. **Open Serial Monitor** (115200 baud)
4. **Place finger on sensor**

**Expected result:**
```
♥ HEARTBEAT #1 | BPM: 72 | Interval: 833ms
```

LED on Pin 13 blinks with each heartbeat!

✅ **If you see this** → Sensor works! Hardware is fine.
❌ **If you don't** → Hardware issue (see troubleshooting below)

---

### Test 2: Processing Visualizer (OPTIONAL)

1. **Open:** `test/processing/Simple_Pulse_Visualizer.pde`
2. **Update line 29:** Change `"COM3"` to YOUR Arduino port
3. **Run** the sketch

**Expected result:**
- Red waveform showing heartbeat
- "PULSE DETECTED" appears with each beat
- Real-time graph of sensor signal

---

## 📖 Full Instructions

See: **`test/HARDWARE_TEST_README.md`**

Comprehensive guide with:
- Step-by-step instructions
- Troubleshooting for every issue
- How to adjust threshold
- What each value means
- Success/failure criteria

---

## 🔍 What These Tests Show

### ✅ If Tests PASS

**Your Pulse Sensor hardware is working!**

This means:
- Sensor is connected correctly
- Sensor can read heartbeats
- Arduino-to-computer communication works

**Problem is in the visualizer code:**
- Processing serialEvent() parsing
- Port selection
- Data format compatibility

→ Return to the visualizer branch and debug software issues

### ❌ If Tests FAIL

**Hardware problem**

Check in order:
1. **Wiring** (Red→5V, Black→GND, Purple→A0)
2. **Sensor LED** (should light your finger)
3. **Finger placement** (gentle, fingertip, stay still)
4. **Threshold** (try 400, 500, 550, 600)
5. **Different sensor** (if available)

---

## 🎯 Why This Test is Better

### Simple Arduino Code
- **NO libraries** required
- Just reads analog pin A0
- Simple threshold detection
- Easy to understand and modify

### Clear Output
- Shows exactly what sensor is reading
- Diagnostic messages for problems
- Real-time BPM calculation
- LED blinks so you can see beats

### Independent Test
- Doesn't depend on complex visualizer
- No Processing tabs needed
- No serial format confusion
- Just raw sensor → Arduino → Serial Monitor

---

## 📊 Interpreting Results

### Good Signal
```
Signal: 480-620 (range: 140)
♥ HEARTBEAT #5 | BPM: 68
✓ Signal strength looks good
```
**Sensor is working perfectly!**

### Weak Signal
```
Signal: 500-520 (range: 20)
⚠ WARNING: Weak signal
No beats detected yet
```
**Sensor reading but not detecting beats**
→ Adjust threshold or improve contact

### No Signal
```
Signal: 512 (range: 2)
⚠ WARNING: Very low signal variation!
→ Check sensor wiring
```
**Sensor not connected or faulty**
→ Check wiring, test with different sensor

---

## 🔧 Quick Fixes

### No beats detected?

**Edit Arduino code, change:**
```arduino
const int THRESHOLD = 550;   // Try: 400, 500, 600
```

### Noisy/erratic signal?

- Don't press too hard
- Use fingertip (not pad)
- Stay completely still
- Wait 10 seconds

### Processing won't connect?

**Update port name:**
```processing
String portName = "COM3";  // Change to your port!
```

**Find your port:**
- Arduino IDE → Tools → Port
- Or press 'p' in Processing console

---

## 🚀 Next Steps

1. **Run the Arduino test** → See if heartbeats are detected
2. **Share the results** → Tell me what you see
3. **Based on results:**
   - ✅ Passes → Return to debugging visualizer
   - ❌ Fails → Debug hardware/sensor

---

## 📁 File Locations

```
test/
├── HARDWARE_TEST_README.md           ← Full instructions
├── arduino/
│   └── Pulse_Sensor_Hardware_Test.ino  ← Upload this to Arduino
└── processing/
    └── Simple_Pulse_Visualizer.pde     ← Run this in Processing
```

---

## 💡 Why I Created This

You said you weren't confident heartbeats were being detected. This test will give you **absolute certainty** about whether the sensor hardware works.

If the simple test works but the complex visualizer doesn't, we know it's a software issue, not hardware.

If the simple test fails, we know it's a hardware/wiring/sensor issue.

**Either way, we'll know exactly where the problem is!**

---

## ⏮️ Switching Back to Visualizer Branch

When you're done testing:

```bash
git checkout claude/pulse-sensor-debug-repo-xyeeH
```

This returns you to the main visualizer development branch.

---

**Run the test and let me know what you see!** 🔬

The Serial Monitor output will tell us everything we need to know about whether your sensor is working.
