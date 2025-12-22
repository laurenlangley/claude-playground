# 🔬 Pulse Sensor Hardware Verification Test

This is a **simple hardware test** to verify your Pulse Sensor is working correctly before trying the full visualizer.

## 📋 What This Tests

✅ Sensor is connected properly
✅ Sensor is reading values
✅ Sensor can detect heartbeats
✅ Arduino-to-computer communication works
✅ Processing can receive data

---

## 🚀 Quick Start - Test in 3 Steps

### Step 1: Upload Arduino Test Code

**File:** `test/arduino/Pulse_Sensor_Hardware_Test.ino`

1. **Open** the sketch in Arduino IDE
2. **Upload** to your Arduino Uno
3. **Open Serial Monitor** (Tools → Serial Monitor)
4. **Set baud rate** to **115200**
5. **Place finger gently on sensor**

**What you should see:**
```
╔════════════════════════════════════════╗
║   PULSE SENSOR HARDWARE TEST           ║
╚════════════════════════════════════════╝

MONITORING... (format: Signal | Status)
═══════════════════════════════════════
Signal: 512 | Range: 510-515 | -----
Signal: 518 | Range: 510-520 | -----

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
♥ HEARTBEAT #1 | BPM: 72 | Interval: 833ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signal: 525 | Range: 510-530 | PULSE | BPM: 72
```

**LED on Pin 13** should blink with each heartbeat!

---

### Step 2: Interpret Arduino Results

#### ✅ SUCCESS - Sensor Works!
```
Signal: 500-600 range
♥ HEARTBEAT messages appearing
BPM: 60-100 (normal resting)
LED blinking with heartbeat
```

#### ⚠️ PARTIAL - Sensor reads but no beats
```
Signal: values changing (400-700)
NO heartbeat messages
Range is good (>30)
```
**Fix:** Adjust `THRESHOLD` in the code (try 400, 500, 550, 600)

#### ❌ FAILURE - Sensor not working
```
Signal: stuck at 0, 1023, or constant value
Range: <10 (almost no variation)
```
**Problem:** Wiring issue or faulty sensor

---

### Step 3: Test with Processing Visualizer (Optional)

**File:** `test/processing/Simple_Pulse_Visualizer.pde`

This shows a **real-time graph** of your sensor signal.

1. **Find your Arduino port:**
   - Arduino IDE → Tools → Port
   - Note the port (e.g., COM3, /dev/ttyACM0)

2. **Update the Processing code:**
   - Open `Simple_Pulse_Visualizer.pde`
   - Line 29: Change `String portName = "COM3";` to YOUR port
   - Save

3. **Run the Processing sketch**

**What you'll see:**
- Red waveform showing sensor signal
- Green threshold line
- "PULSE DETECTED" when signal crosses threshold
- Current signal value displayed

---

## 🔧 Troubleshooting Guide

### Issue: Signal stuck at 0 or 1023

**Cause:** Wiring problem

**Check:**
- [ ] Red wire → 5V
- [ ] Black wire → GND
- [ ] Purple wire → A0
- [ ] Wires are secure
- [ ] Arduino is powered

---

### Issue: Signal doesn't change with finger

**Cause:** Sensor not reading or finger placement

**Try:**
1. Check sensor **LED is lit** (should light up your finger)
2. Use **fingertip** (not pad)
3. **Light pressure** (like touching a phone screen)
4. Try **different finger**
5. Clean sensor with rubbing alcohol
6. Test with **different person**

---

### Issue: Signal changes but no beats detected

**Cause:** Threshold is wrong

**Fix:**
1. Note the signal range from Serial Monitor (e.g., 400-650)
2. Set threshold to middle of range (e.g., 525)
3. Update `THRESHOLD` in Arduino code
4. Re-upload and test

**Threshold values to try:**
- Normal: 550
- Weak signal: 500
- Strong signal: 600
- Very weak: 450

---

### Issue: Erratic/noisy signal

**Cause:** Movement or poor contact

**Fix:**
- Stay **completely still**
- Don't **press too hard**
- Ensure **good skin contact**
- Wait **10 seconds** for stabilization
- Avoid fluorescent lights (can cause noise)

---

### Issue: Processing can't connect

**Cause:** Wrong port or port in use

**Fix:**
1. **Close Arduino Serial Monitor** (can't have both open!)
2. Check port name matches exactly
3. Try unplugging/replugging Arduino
4. Press 'p' in Processing to list all ports

---

## 📊 Understanding the Output

### Arduino Serial Monitor Output

**Format:**
```
Signal: XXX | Range: MIN-MAX | STATUS | BPM: XX
```

**Signal:** Current sensor reading (0-1023)
- **512:** Typical idle (no finger)
- **400-700:** Normal with finger
- **0 or 1023:** Error - check wiring

**Range:** Min-max values over last 5 seconds
- **<10:** Very weak signal - problem!
- **10-30:** Weak signal - try adjusting
- **>30:** Good signal strength ✓

**Status:**
- **-----** No pulse
- **PULSE** Currently detecting pulse

**BPM:** Beats per minute (60-100 is normal resting)

---

### Processing Visualizer

**Red waveform:** Shows sensor signal over time
- Should show smooth waves when heart beats
- Peaks should cross the green threshold line

**Green line:** Threshold for beat detection
- Signal above = beat detected
- Signal below = no beat

**Signal variation:** Should be >30 for good detection

---

## ✅ Success Criteria

Your sensor is working correctly if:

1. ✓ Arduino Serial Monitor shows changing signal values
2. ✓ Signal range is >30
3. ✓ You see "♥ HEARTBEAT" messages
4. ✓ BPM is reasonable (40-120)
5. ✓ LED blinks with each heartbeat
6. ✓ Processing shows waveform (if tested)

---

## 🎯 What to Do Next

### If Tests PASS ✓

Your sensor hardware is **working correctly!**

The problem is in the full visualizer code. Possible issues:
- Processing `serialEvent()` not parsing data correctly
- Port selection not working
- Data format mismatch

→ Go back to debugging the full visualizer with confidence that hardware works!

### If Tests FAIL ✗

Hardware issue. Check in this order:

1. **Wiring** - Recheck all three connections
2. **Power** - Is Arduino getting power? (LED should be on)
3. **Sensor** - Try a different Pulse Sensor if available
4. **USB cable** - Try a different cable
5. **Arduino** - Try a different Arduino if available

---

## 📝 Adjustment Guide

### Changing Threshold

Edit this line in the Arduino code:
```arduino
const int THRESHOLD = 550;  // ← Change this number
```

**How to choose:**
1. Run the test and watch Serial Monitor
2. Note the signal range (e.g., 450-650)
3. Calculate middle: (450 + 650) / 2 = 550
4. Set THRESHOLD to that value
5. If too sensitive (false beats): increase by 25
6. If not sensitive enough (missing beats): decrease by 25

### Changing Sample Rate

Edit this line:
```arduino
const int SAMPLE_RATE = 20;  // ← Milliseconds between readings
```

- **20ms** = 50Hz (recommended)
- **10ms** = 100Hz (faster, more data)
- **50ms** = 20Hz (slower, less data)

---

## 🔬 Advanced Diagnostics

### Check Sensor LED

The Pulse Sensor has a **small LED on the back** that illuminates your finger.

**LED OFF:**
- Not getting power
- Check 5V and GND connections

**LED ON:**
- Getting power ✓
- Problem is in signal or detection

### Measure with Multimeter

If you have a multimeter:

1. **Voltage test:** VCC to GND should read ~5V
2. **Signal test:** Signal to GND should vary 0-5V when finger placed

### Test Without Library

The test code I provided uses **NO external libraries**. It's pure Arduino code reading an analog pin. If this doesn't work, it's definitely a hardware issue.

---

## 📞 Getting Help

If tests still fail, provide this info:

1. **What Arduino Serial Monitor shows** (copy/paste output)
2. **Signal range** you're seeing
3. **Is sensor LED lit?**
4. **Photo of your wiring**
5. **Sensor model** (pulsesensor.com original? clone?)

---

**Good luck! 🚀**

This test will definitively show if your sensor hardware is working.
