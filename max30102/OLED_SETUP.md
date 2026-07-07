# 🖥️ Adding the SSD1306 OLED Display (BPM Readout)

Your **Hosyond 0.96" OLED (SSD1306, 128x64, I2C)** shares the **same I2C bus** as the
MAX30102. That means both devices connect to **A4 (SDA)** and **A5 (SCL)** together —
no extra Arduino pins required.

- MAX30102 lives at I2C address **0x57**
- SSD1306 OLED lives at I2C address **0x3C** (some are 0x3D — we'll verify)

Because the addresses differ, they coexist on the same two wires with zero conflict.

---

## 🔌 Wiring (Breadboard)

I2C is a **shared bus**. On your breadboard, SDA and SCL are common rails that every
I2C device taps into.

```
                 ┌──────────── Arduino Uno ────────────┐
   5V  ──────────┤ 5V                                  │
   GND ──────────┤ GND                                 │
   A4  ──────────┤ A4 (SDA)                            │
   A5  ──────────┤ A5 (SCL)                            │
                 └─────────────────────────────────────┘
                        │    │    │    │
        breadboard rails │    │    │    │
             +5V ────────●────┼────┼────┼───────●   (VIN sensor / VCC oled)
             GND ────────┼────●────┼────┼───────●
             SDA ────────┼────┼────●────┼───────●   (both SDA pins)
             SCL ────────┼────┼────┼────●───────●   (both SCL pins)
```

### Connection table

| Signal | Arduino | MAX30102 | OLED   |
|--------|---------|----------|--------|
| Power  | 5V      | VIN      | VCC    |
| Ground | GND     | GND      | GND    |
| I2C Data | A4    | SDA      | SDA    |
| I2C Clock| A5    | SCL      | SCL    |

**On the breadboard:** run a short jumper so both the sensor's SDA and the OLED's SDA
sit in the **same column/rail**, and likewise for SCL, 5V, and GND. Everything ties to
the same four Arduino pins.

> The SSD1306 module runs happily on 5V (it has an onboard regulator). If your board
> is labeled 3.3V only, use the 3.3V rail for the OLED's VCC — but keep the MAX30102 on
> 5V since that's what gave you the strong signal.

---

## 📚 Install the Display Libraries

Arduino IDE → **Sketch → Include Library → Manage Libraries**, then install both:

1. **Adafruit SSD1306**
2. **Adafruit GFX Library**

(When you install Adafruit SSD1306 it usually offers to pull in GFX and BusIO —
click **Install All**.)

---

## 🔍 Step 1: Confirm Both Devices on the Bus

Re-upload the **I2C_Scanner** sketch you already have
(`max30102/arduino/I2C_Scanner/`) and open Serial Monitor (115200).

You should now see **TWO** devices:

```
✓ Device found at address 0x3C   ← OLED DISPLAY
✓ Device found at address 0x57   ← MAX30102 HEART RATE SENSOR!
✓ Found 2 device(s)
```

- See **0x3C**? Great — the sketch is already set for it.
- See **0x3D** instead? Open the BPM sketch and change `#define OLED_ADDR 0x3C` to `0x3D`.
- See only 0x57 (no display)? Recheck the OLED's SDA/SCL/VCC/GND on the breadboard.

---

## ❤️ Step 2: Upload the BPM Display Sketch

Upload `max30102/arduino/MAX30102_OLED_BPM/MAX30102_OLED_BPM.ino`.

**The OLED shows the average BPM** in large digits, with a status line
(Low / Normal / Elevated). When no finger is present it prompts you to place one.
The Serial Monitor still prints beats too, so you can watch both.

---

## 🧠 Memory Note (Arduino Uno)

The Uno has only 2 KB of RAM. The Adafruit SSD1306 library uses a 1 KB screen buffer,
so this combined sketch keeps its own RAM use lean (all the text messages are stored in
flash via the `F()` macro). It compiles to well under the limit, but if you later add
features and see a **"low memory available, stability problems may occur"** warning,
that's why — trim strings or switch to the lighter U8g2 library in page mode.

---

## 🐛 Troubleshooting

**OLED stays black:**
- Confirm scanner shows the display address (0x3C or 0x3D) and that `OLED_ADDR` matches.
- Check VCC and GND to the OLED.
- Some clones need `SSD1306_SWITCHCAPVCC` (already used in the sketch).

**Display works but sensor stopped (or vice-versa):**
- Loose shared SDA/SCL rail. Reseat the jumpers tying both devices together.

**Numbers jump around:**
- Normal at first — it averages the last 4 beats and settles within a few seconds.
- Keep your finger still with steady, light pressure.
