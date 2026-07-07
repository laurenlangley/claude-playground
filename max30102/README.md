# 🫀 MAX30102 Heart Rate & SpO2 Sensor Setup

The MAX30102 is a superior sensor that measures:
- ❤️ **Heart Rate** (BPM)
- 🩸 **Blood Oxygen** (SpO2 %)
- Uses **I2C** communication (not analog like Pulse Sensor)

---

## 📋 What You Need

### Hardware
- ✅ MAX30102 sensor module
- ✅ Arduino Uno
- ✅ 4 jumper wires (not 3 like before!)

### Software
- ✅ Arduino IDE
- ✅ MAX30102 library (we'll install this)

---

## 🔌 Wiring - IMPORTANT: Different from Pulse Sensor!

```
MAX30102 → Arduino Uno
─────────────────────────
VIN (or VCC) → 5V
GND          → GND
SDA          → A4 (I2C Data)
SCL          → A5 (I2C Clock)
INT          → (leave unconnected for basic use)
```

**CRITICAL NOTES:**
- Some MAX30102 modules need **3.3V** instead of 5V - check your module!
- **SDA goes to A4** (not A0 like before!)
- **SCL goes to A5** (new connection!)
- This is I2C, not analog - completely different protocol

---

## 📚 Install the Library

### Method 1: Arduino Library Manager (Easiest)

1. Open **Arduino IDE**
2. Go to **Sketch → Include Library → Manage Libraries**
3. Search for **"MAX30105"** (yes, 105, not 102)
4. Install **"SparkFun MAX3010x Pulse and Proximity Sensor Library"** by SparkFun
5. Click **Install**

### Method 2: Manual Install

If Library Manager doesn't work:
1. Go to: https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library
2. Click **Code → Download ZIP**
3. Arduino IDE → **Sketch → Include Library → Add .ZIP Library**
4. Select the downloaded ZIP

---

## ⚡ Quick Test (Upload This First!)

See: `max30102/arduino/MAX30102_Quick_Test/`

This will verify:
- ✅ Sensor is connected
- ✅ I2C communication works
- ✅ Sensor is detected
- ✅ You can see heart rate

**Expected output in Serial Monitor (115200 baud):**
```
MAX30102 Found!
Place finger on sensor...
♥ BPM: 72 | SpO2: 98%
```

---

## 🎯 Full Heart Rate Monitor

See: `max30102/arduino/MAX30102_Heart_Monitor/`

Features:
- Real-time heart rate (BPM)
- Blood oxygen percentage (SpO2)
- IR signal strength indicator
- Finger detection
- Diagnostic messages

---

## 🖥️ Processing Visualizer

See: `max30102/processing/MAX30102_Visualizer/`

Shows:
- Live heart rate waveform
- BPM display
- SpO2 percentage
- Signal quality indicator

---

## 🐛 Troubleshooting

### "MAX30102 not found" error

**Possible causes:**
1. **Wrong wiring** - Double-check SDA→A4, SCL→A5
2. **Wrong voltage** - Try 3.3V instead of 5V
3. **Loose connections** - Firmly push wires in
4. **Faulty module** - Try a different MAX30102

**Test I2C connection:**
Upload the I2C Scanner sketch (see `max30102/arduino/I2C_Scanner/`)

### No heart rate detected

**Try this:**
1. **Place finger correctly** - Cover sensor completely
2. **Don't press too hard** - Light pressure
3. **Stay still** - Wait 5-10 seconds
4. **Clean finger** - Wash and dry hands
5. **Try different finger** - Index finger works best

### SpO2 shows 0%

SpO2 takes longer to calculate than BPM. Wait 15-20 seconds with finger on sensor.

---

## 📊 Understanding the Sensor

### How It Works

The MAX30102 has:
- **Red LED** - Detects heart rate
- **IR LED** - Detects blood oxygen
- **Photodetector** - Measures reflected light

It doesn't just read voltage like the old sensor - it uses sophisticated algorithms!

### Typical Values

**Heart Rate (BPM):**
- Resting: 60-100
- Athletic: 40-60
- During exercise: 100-180

**SpO2 (Blood Oxygen):**
- Normal: 95-100%
- Low: <95% (may need medical attention)
- The sensor is ±2% accurate

---

## 🔄 Converting Your Visualizer

Your existing Processing visualizer can be adapted for MAX30102!

**Changes needed:**
1. Serial data format changes
2. Add SpO2 display
3. Adjust for I2C sampling rate

See the new Processing sketch for a working example.

---

## 🎓 Key Differences from Pulse Sensor

| Feature | Pulse Sensor | MAX30102 |
|---------|--------------|----------|
| Communication | Analog (A0) | I2C (A4/A5) |
| Wires | 3 | 4 |
| Measurements | Heart rate only | Heart rate + SpO2 |
| Accuracy | Good | Excellent |
| Library | Optional | Required |
| Speed | 50Hz | 25-400Hz configurable |

---

## 📁 File Structure

```
max30102/
├── README.md                          ← You are here
├── WIRING_GUIDE.md                    ← Detailed wiring
├── arduino/
│   ├── I2C_Scanner/                   ← Test I2C connection
│   ├── MAX30102_Quick_Test/           ← 2-minute test
│   ├── MAX30102_Heart_Monitor/        ← Full monitor
│   └── MAX30102_Processing_Data/      ← For visualizer
└── processing/
    └── MAX30102_Visualizer/           ← Real-time display
```

---

## 🚀 Quick Start Checklist

- [ ] Install SparkFun MAX3010x library
- [ ] Wire sensor: VIN→5V, GND→GND, SDA→A4, SCL→A5
- [ ] Upload I2C_Scanner to verify connection
- [ ] Upload MAX30102_Quick_Test
- [ ] Open Serial Monitor (115200 baud)
- [ ] Place finger on sensor
- [ ] See heart rate and SpO2!

---

**Let's get started!** Upload the Quick Test first to verify your sensor works! 🎉
