# 🔌 MAX30102 Wiring Guide

## Visual Wiring Diagram

```
    MAX30102 Sensor                  Arduino Uno
    ┌─────────────┐                 ┌──────────┐
    │             │                 │          │
    │   ┌───┐     │                 │    13 ●  │
    │   │ ● │     │                 │    12 ●  │
    │   └───┘     │                 │    ~11●  │
    │  Sensor     │                 │    ~10●  │
    │             │                 │    ~9 ●  │
    │             │                 │     8 ●  │
    └─────────────┘                 │          │
         │││││                      │     7 ●  │
         │││││                      │    ~6 ●  │
         ↓↓↓↓↓                      │    ~5 ●  │
                                    │     4 ●  │
    VIN ──────────────────────────→ │ 5V       │
    GND ──────────────────────────→ │ GND      │
    SDA ──────────────────────────→ │ A4 (SDA) │
    SCL ──────────────────────────→ │ A5 (SCL) │
    INT   (leave unconnected)       │          │
                                    └──────────┘
```

---

## Pin Connections

| MAX30102 Pin | Arduino Pin | Wire Color (Suggested) | Purpose |
|--------------|-------------|------------------------|---------|
| VIN or VCC   | 5V          | Red                    | Power   |
| GND          | GND         | Black                  | Ground  |
| SDA          | A4          | Blue or Green          | I2C Data |
| SCL          | A5          | Yellow or White        | I2C Clock |
| INT          | (none)      | -                      | Interrupt (optional) |

---

## Step-by-Step Wiring

### 1. Power Connection
```
MAX30102 VIN → Arduino 5V
```
- Use a **RED** wire
- Connect to the **5V** pin on Arduino
- **Note:** Some modules need 3.3V - check your module's label!

### 2. Ground Connection
```
MAX30102 GND → Arduino GND
```
- Use a **BLACK** wire
- Connect to any **GND** pin on Arduino

### 3. I2C Data Connection
```
MAX30102 SDA → Arduino A4
```
- Use a **BLUE** or **GREEN** wire
- Connect to **A4** pin (also labeled SDA on some Arduino boards)
- This carries data between Arduino and sensor

### 4. I2C Clock Connection
```
MAX30102 SCL → Arduino A5
```
- Use a **YELLOW** or **WHITE** wire
- Connect to **A5** pin (also labeled SCL on some Arduino boards)
- This synchronizes communication

### 5. Interrupt Pin (Optional - Leave Disconnected)
```
MAX30102 INT → (nothing)
```
- Not needed for basic heart rate monitoring
- Can be used for advanced features

---

## Important Notes

### ⚠️ Voltage Selection (CRITICAL!)

**Check your MAX30102 module!**

Some modules are **5V tolerant**, some require **3.3V only**.

**How to tell:**
1. Look at module label - might say "3.3V" or "5V"
2. Check product description
3. If unsure, start with **3.3V** (safer)

**Using 3.3V:**
- Connect VIN → **3.3V** pin (not 5V)
- Everything else stays the same

**Using 5V:**
- Connect VIN → **5V** pin
- Most common for breakout boards

---

## I2C Pins on Different Arduino Boards

| Arduino Board | SDA Pin | SCL Pin |
|---------------|---------|---------|
| Uno           | A4      | A5      |
| Nano          | A4      | A5      |
| Mega 2560     | 20      | 21      |
| Leonardo      | 2       | 3       |
| Due           | 20      | 21      |

**You have Arduino Uno, so use A4 and A5!**

---

## Checking Your Wiring

### Visual Inspection Checklist

Before uploading code, verify:

- [ ] VIN wire goes to 5V (or 3.3V)
- [ ] GND wire goes to GND
- [ ] SDA wire goes to A4
- [ ] SCL wire goes to A5
- [ ] All wires are **firmly inserted**
- [ ] No wires are **loose** or **touching** each other
- [ ] Sensor is oriented correctly

### Test with I2C Scanner

Upload `I2C_Scanner.ino` to verify:
- ✅ I2C connection works
- ✅ Sensor appears at address 0x57
- ✅ Wiring is correct

---

## Common Wiring Mistakes

### ❌ WRONG: Using A0 (analog pin from old sensor)
```
SDA → A0  ❌  WRONG!
```
**Correct:**
```
SDA → A4  ✓
```

### ❌ WRONG: Swapping SDA and SCL
```
SDA → A5
SCL → A4  ❌  WRONG!
```
**Correct:**
```
SDA → A4
SCL → A5  ✓
```

### ❌ WRONG: Missing a wire
```
Only 3 wires connected  ❌  WRONG!
```
**Correct:**
```
4 wires: VIN, GND, SDA, SCL  ✓
```

---

## Troubleshooting Wiring Issues

### Problem: "MAX30102 NOT FOUND"

**Check this order:**

1. **Power**
   - Is VIN connected to 5V (or 3.3V)?
   - Try touching sensor - does it feel warm? (slight warmth is normal)

2. **Ground**
   - Is GND connected?
   - Try a different GND pin

3. **I2C Pins**
   - Is SDA connected to **A4**?
   - Is SCL connected to **A5**?
   - Try removing and reinserting wires

4. **Voltage**
   - If using 5V doesn't work, try 3.3V
   - Check module specifications

5. **Test**
   - Upload I2C_Scanner
   - Should show device at 0x57

---

## Quick Reference Card

**Print this out and keep it handy!**

```
╔═══════════════════════════════════╗
║  MAX30102 → ARDUINO UNO           ║
╠═══════════════════════════════════╣
║  VIN (Red)    →  5V               ║
║  GND (Black)  →  GND              ║
║  SDA (Blue)   →  A4               ║
║  SCL (Yellow) →  A5               ║
║  INT          →  (not connected)  ║
╚═══════════════════════════════════╝
```

---

## Photos of Correct Wiring

*Note: Take a photo of your wiring and compare with online examples*

Search Google Images for: "MAX30102 Arduino Uno wiring"

---

## Next Steps

Once wired:
1. ✅ Upload `I2C_Scanner.ino` - Verify sensor is detected
2. ✅ Upload `MAX30102_Quick_Test.ino` - Test heart rate
3. ✅ See heart rate in Serial Monitor!

---

**Double-check your wiring before uploading code!** 🔧
