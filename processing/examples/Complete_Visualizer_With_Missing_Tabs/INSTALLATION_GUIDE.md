# ✅ CORRECTED FILES - Installation Guide

## The Error You Got

```
The method update() in the type PulseSensorAmpd_Processing_Visualizer.Scrollbar
is not applicable for the arguments (int, int)
```

**This means:** You successfully added the Scrollbar file, but it had the wrong method signature!

## ✅ I've Fixed It!

The **corrected files** are now in this folder. Use these instead.

---

## 📁 Files You Need (ALL CORRECTED)

1. **serialEvent.pde** ← Receives Arduino data
2. **Scrollbar.pde** ← Fixed update(int, int) method
3. **Radio.pde** ← Port selection buttons

Plus you may need:
4. **mousePressed function** ← Add to your main sketch

---

## 🚀 Installation Steps

### Step 1: Locate Your Processing Sketch Folder

1. Open your Processing sketch
2. Go to: **Sketch → Show Sketch Folder**
3. A folder will open (e.g., `Documents/Processing/YourSketchName/`)

### Step 2: Copy the Corrected Files

Copy these 3 files into that folder:
- `serialEvent.pde`
- `Scrollbar.pde` (CORRECTED VERSION)
- `Radio.pde`

**IMPORTANT:** If you already copied the old Scrollbar.pde, REPLACE it with this corrected one!

### Step 3: Add mousePressed Function

Open your MAIN .pde file (the one with setup() and draw()) and add this at the end:

```processing
void mousePressed() {
  if (!serialPortFound) {
    // Only check buttons when port selection is active
    for (int i = 0; i <= numPorts; i++) {
      button[i].pressRadio(mouseX, mouseY);
    }
  }
}
```

### Step 4: Restart Processing

- **Close** Processing completely
- **Reopen** your sketch
- You should see **4 tabs** at the top:
  - Your main sketch
  - serialEvent
  - Scrollbar
  - Radio

### Step 5: Run It!

1. Make sure Arduino is connected and running your Pulse Sensor code
2. Click **Run** (play button)
3. Click the **radio button** next to your Arduino port (e.g., COM3)
4. **Wait 5-10 seconds** with finger on sensor

---

## ✅ What Should Happen

1. **Immediately:** Pulse waveform starts drawing
2. **Within 10 seconds:** BPM shows a number (60-100 typical)
3. **With each beat:** Heart graphic pulses

---

## 🐛 If It Still Doesn't Work

### Error: "Cannot find anything named 'port'"

Add this to the **top** of your main sketch (after the imports):
```processing
Serial port;
```

### Error: "Cannot find anything named 'numPorts'"

The variables are defined in your main sketch. Make sure you didn't delete them.

### Error about 'serialPort' or 'serialPorts'

These should be in your main sketch already. Don't delete them!

### Port selection works but no heartbeat

**Probably a threshold issue.** Run the Threshold Finder:
- Location: `arduino/examples/PulseSensor_Threshold_Finder/`
- Upload it, open Serial Monitor (115200 baud)
- Follow instructions
- Update your main Arduino code with the recommended threshold

---

## 🔍 Quick Test: Is Arduino Working?

Before worrying about Processing, verify Arduino is sending data:

1. **Close Processing**
2. Arduino IDE → Serial Monitor
3. Set baud to **115200**
4. Place finger on sensor

**You should see:**
```
S512
S515
B75    ← BPM (when heart beats)
Q800   ← IBI timing
```

If you don't see this, the problem is Arduino/sensor, not Processing.

---

## 📋 File Contents Summary

### serialEvent.pde
- Listens for serial data from Arduino
- Parses 'S', 'B', and 'Q' messages
- Updates Sensor, BPM, and IBI variables

### Scrollbar.pde (CORRECTED)
- Creates the zoom scrollbar
- **Fixed:** update(int, int) method now accepts mouseX, mouseY parameters
- Controls pulse window scale (0.5 to 1.0)

### Radio.pde
- Creates clickable port selection buttons
- Connects to selected serial port at 115200 baud
- Handles port refresh

### mousePressed function
- Detects clicks on radio buttons
- Activates port selection

---

## 🎯 Folder Structure Should Look Like

```
YourSketchFolder/
├── YourMainSketch.pde        ← Your original file
├── serialEvent.pde           ← NEW
├── Scrollbar.pde             ← NEW (corrected)
├── Radio.pde                 ← NEW
└── (any other files you have)
```

---

## ⚡ Quick Fix Checklist

- [ ] Copied all 3 .pde files to sketch folder
- [ ] Used the CORRECTED Scrollbar.pde (from this folder)
- [ ] Added mousePressed() function to main sketch
- [ ] Restarted Processing
- [ ] See 4 tabs at top of Processing window
- [ ] Arduino is running and sending data (check Serial Monitor)
- [ ] Selected correct port in Processing
- [ ] Waited 10 seconds with finger on sensor

---

## 🆘 Still Getting Errors?

**Share the exact error message** and I'll help fix it!

Common issues:
1. Variable not found → Make sure you didn't delete variables from main sketch
2. Method signature mismatch → Make sure you're using the CORRECTED files
3. Serial port issues → Check Arduino is connected and port name is correct
4. No heartbeat → Threshold adjustment needed (use Threshold Finder tool)

---

**Good luck!** The Scrollbar error is now fixed. Just copy these corrected files and you should be good to go! 🚀
