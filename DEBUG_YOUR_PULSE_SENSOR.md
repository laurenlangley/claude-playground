# 🔍 Debug Your Pulse Sensor - START HERE

## Problem: No Heartbeat Visualized

You have the Processing visualizer but no heartbeat shows up. Let's fix it!

## 🚨 CRITICAL INFORMATION NEEDED

**I need to see your Arduino code!** You mentioned you have Arduino code but didn't share it yet.

Please share your Arduino `.ino` file so I can check:
1. The serial communication format
2. The baud rate
3. The pulse detection algorithm
4. Whether it's sending 'S', 'B', and 'Q' messages

## 📋 Debugging Steps (Do These In Order)

### Step 1: Verify Your Processing Code is Complete

Your Processing code calls `serialEvent()` but doesn't define it!

**Check:** Open your Processing sketch and look for TABS at the top:
- Do you see a tab called `serialEvent`?
- Do you see tabs for `Scrollbar` and `Radio`?

**If NO:** Your Processing code is incomplete. You need the full Pulse Sensor Processing visualizer.

**Download complete code from:**
https://github.com/WorldFamousElectronics/PulseSensor_Amped_Processing_Visualizer

---

### Step 2: Test Serial Communication

Upload this test sketch to verify Processing can receive data:

**Location:** `arduino/examples/Serial_Echo_Test/Serial_Echo_Test.ino`

This sends fake heartbeat data at 75 BPM.

**Expected result:**
- Processing should show a smooth sine wave
- BPM should read 75
- Heart graphic should pulse

**If this works:** Your Arduino pulse sensor code is the problem
**If this doesn't work:** Communication/port/baud rate issue

---

### Step 3: Check What Your Arduino is Actually Sending

Use the Serial Data Debugger to see the raw data:

**Location:** `processing/examples/Serial_Data_Debugger/Serial_Data_Debugger.pde`

**Before running:**
1. Update `portName` in the sketch
2. Update `baudRate` (probably 115200)
3. Make sure your Arduino is connected and running

**What to look for:**
```
✓ GOOD:
S512
S515
S520
B75      ← BPM appears when beat detected
Q800     ← IBI appears when beat detected
S518

✗ BAD:
512       ← Missing 'S' character!
515
BPM:75    ← Wrong format!
```

---

### Step 4: Verify Arduino Code Format

Your Arduino MUST send data in this exact format:

```arduino
void loop() {
  int Signal = analogRead(pulsePin);

  // Send sensor data EVERY loop
  Serial.print('S');
  Serial.println(Signal);

  // Send BPM only when beat is detected
  if (beatDetected) {
    Serial.print('B');
    Serial.println(BPM);

    Serial.print('Q');
    Serial.println(IBI);
  }

  delay(20);  // 20ms = 50Hz update rate
}
```

**Common mistakes:**
- ❌ Missing the 'S', 'B', 'Q' character prefixes
- ❌ Wrong baud rate (should be 115200)
- ❌ Sending formatted text instead of simple values
- ❌ Not sending 'S' every loop

---

### Step 5: Check Baud Rate

**Arduino code should have:**
```arduino
Serial.begin(115200);  // Standard for Pulse Sensor
```

**Processing code should have:**
This is likely in a `setupSerial()` function or in the port selection code.
Look for: `new Serial(this, portName, 115200)`

**Both must match!**

---

## 🔧 Quick Diagnostic Commands

### Check Arduino Serial Output (Arduino IDE)
1. **Close Processing completely** (important!)
2. Open Arduino IDE → Tools → Serial Monitor
3. Set baud to 115200 (or whatever your code uses)
4. You should see:
   ```
   S512
   S515
   S520
   B75
   Q800
   ```

### List Available Serial Ports (Processing)
In Processing console (bottom):
```processing
printArray(Serial.list());
```

Common port names:
- Windows: `COM3`, `COM4`, `COM5`
- Mac: `/dev/cu.usbmodem14101`
- Linux: `/dev/ttyACM0`, `/dev/ttyUSB0`

---

## 📁 Helpful Files I Created

| File | Purpose |
|------|---------|
| `arduino/examples/Serial_Echo_Test/` | Test sketch to verify Processing communication |
| `processing/examples/Serial_Data_Debugger/` | Shows exactly what Arduino is sending |
| `docs/processing-arduino-debugging.md` | Detailed debugging guide |
| `docs/troubleshooting.md` | General pulse sensor issues |

---

## 🎯 What I Need From You

To help you further, please provide:

1. **Your Arduino code** (.ino file) - MOST IMPORTANT!
2. **Baud rate** used in Arduino `Serial.begin(?)`
3. **What you see** in Arduino Serial Monitor
4. **Do you have all Processing tabs?** (serialEvent, Scrollbar, Radio)
5. **Test results** from Serial_Echo_Test sketch

---

## 💡 Most Common Issues & Solutions

### Issue: "Select Your Serial Port" won't go away
**Cause:** Processing can't connect to Arduino
**Fix:**
- Try each port in the list
- Make sure Arduino is plugged in
- Restart Processing
- Unplug/replug Arduino

### Issue: Processing connects but shows flat line
**Cause:** Not receiving sensor data or wrong format
**Fix:**
- Run Serial_Data_Debugger to see actual data
- Verify Arduino is sending 'S' messages
- Check baud rate matches

### Issue: Pulse wave shows but BPM = 0
**Cause:** Receiving 'S' but not 'B' or 'Q'
**Fix:**
- Arduino isn't detecting beats
- Check threshold value in Arduino code
- Verify finger is properly on sensor
- Make sure sensor LED is lit

### Issue: Everything works but no heartbeat detected
**Cause:** Threshold too high/low or sensor contact
**Fix:**
- Adjust threshold in Arduino code
- Don't press too hard on sensor
- Use fingertip, not finger pad
- Stay very still for 5-10 seconds
- Make sure sensor LED lights your finger

---

## 🚀 Next Steps

1. **Share your Arduino code with me**
2. **Run the Serial_Echo_Test** to verify Processing works
3. **Run the Serial_Data_Debugger** to see what format your Arduino uses
4. **Report back what you find**

Then I can give you specific fixes for your exact code!

---

**Created:** 2025-12-22
**Status:** Waiting for Arduino code to continue debugging
