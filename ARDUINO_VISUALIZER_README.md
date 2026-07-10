# Arduino Heartbeat Visualizer

Real-time heartbeat visualization using Arduino MAX30102 sensor with web-based graphics.

## Overview

This system connects an Arduino with a MAX30102 heartbeat sensor and OLED display to a sophisticated web visualizer. The Arduino streams sensor data over USB serial, and the web app visualizes it in real-time with multiple visualization modes.

## Hardware Required

1. **Arduino** (Uno, Nano, or similar)
2. **MAX30102 Heart Rate Sensor** (I2C)
3. **SSD1306 OLED Display** (0.96" 128x64, I2C)
4. **Breadboard and jumper wires**
5. **USB cable** (to connect Arduino to computer)

## Wiring Diagram

Both devices share the same I2C bus:

```
Arduino 5V  → MAX30102 VIN  + OLED VCC
Arduino GND → MAX30102 GND  + OLED GND
Arduino A4  → MAX30102 SDA  + OLED SDA (I2C Data)
Arduino A5  → MAX30102 SCL  + OLED SCL (I2C Clock)
```

**I2C Addresses:**
- MAX30102: `0x57`
- SSD1306 OLED: `0x3C` (change to `0x3D` if needed)

## Arduino Libraries Required

Install via Arduino Library Manager:

1. **SparkFun MAX3010x Pulse and Proximity Sensor Library**
2. **Adafruit SSD1306**
3. **Adafruit GFX Library**

## Setup Instructions

### Step 1: Upload Arduino Sketch

1. Open `heartbeat_visualizer_arduino/heartbeat_visualizer_arduino.ino` in Arduino IDE
2. Install the required libraries (listed above)
3. Connect your Arduino via USB
4. Select the correct board and port under Tools menu
5. Upload the sketch
6. Open Serial Monitor (115200 baud) to verify it's working

You should see:
```
READY
W,<value>    (waveform data)
F,1          (finger detected)
B,<bpm>      (beat detected)
A,<avg_bpm>  (average BPM)
```

### Step 2: Open Web Visualizer

1. Open `heartbeat_visualizer.html` in **Chrome** or **Edge** browser
   - **Important**: Web Serial API only works in Chrome/Edge
   - Firefox and Safari are not supported

2. Click **"Connect to Arduino"** button

3. Select your Arduino's serial port from the popup
   - Usually labeled as "USB Serial" or "Arduino"

4. Place your finger on the MAX30102 sensor
   - The red LED should illuminate
   - Keep your finger still for best results

5. Watch the visualization come alive!

## Pulse Audio (Heartbeat Sonification)

The visualizer includes a four-layer audio engine (`pulse_audio.js`, built on Tone.js) that turns each heartbeat into a sonic cascade:

1. **Layer 1** — R-peak percussive kick (t=0)
2. **Layer 2** — T-wave sub bass (t+100ms)
3. **Layer 3** — Pulse-arrival FM synth through a filter (t+250ms)
4. **Layer 4** — Chord pad with reverb (t+400ms)

**Requires the dual-protocol sketch**: upload `pulse_dual_protocol/pulse_dual_protocol.ino` instead of the original sketch. It sends everything the visualizer already used (`W,`/`B,`/`A,`/`F,`) plus `BEAT`, `IBI:<ms>`, and `BPM:<avg>` lines that drive the audio engine.

Audio starts automatically when you connect to the Arduino. Controls in the **Pulse Audio** panel:

- **Enable/Disable Pulse Audio** (or press **A**) — mute/unmute the cascade
- **HRV Modulation** (or press **H**) — maps heart rate variability (RMSSD) to the sound: low HRV = dark filter + dry reverb, high HRV = bright + spacious
- **RMSSD display** — live short-term HRV metric in ms
- **Chord dropdown** — pick the Layer 4 pad chord (Am, Cmaj7, Dm9, Fmaj7, G6, Emin)
- **Layer volume sliders** — per-layer level in dB
- **Filter / Reverb sliders** — manual control (ignored while HRV modulation is on)

Note: Tone.js loads from a CDN, so the audio feature needs an internet connection.

## Visualization Modes

The visualizer offers 5 different modes (press 1-5 to switch):

1. **Waveform** (1) - Shows the raw heartbeat pulse wave
2. **Frequency Spectrum** (2) - Bar graph frequency display
3. **Circular Spectrum** (3) - Radial frequency visualization
4. **Particle Flow** (4) - Particles rising with heartbeat
5. **Oscilloscope** (5) - Medical-style scrolling waveform

## Controls

### Keyboard Shortcuts
- **Space** - Connect/Disconnect Arduino
- **1-5** - Switch visualization modes
- **M** - Toggle audio monitor (if enabled)

### Sliders
- **Sensitivity** - Adjust visualization amplitude (0.1x - 3.0x)
- **Low/High Freq Color** - Change the color gradient (HSL hue 0-360°)

## Data Format

The Arduino sends data over serial at 115200 baud in this format:

```
W,<0-255>      Waveform data point (50 Hz, normalized IR value)
B,<bpm>        Beat detected (instant BPM calculation)
A,<avg_bpm>    Average BPM (updated after each beat)
F,<0|1>        Finger presence (0=no finger, 1=finger detected)
ERROR,<msg>    Error message from Arduino
```

## Troubleshooting

### Arduino Issues

**"MAX30102 not found"**
- Check I2C wiring (SDA to A4, SCL to A5)
- Verify 5V and GND connections
- Try swapping SDA/SCL if wired incorrectly

**"SSD1306 not found"**
- Check OLED I2C address (try changing `OLED_ADDR` to `0x3D`)
- Run an I2C scanner sketch to detect actual address

**No data in Serial Monitor**
- Verify baud rate is set to 115200
- Check USB cable (some cables are charge-only)

**Erratic readings**
- Keep finger still on sensor
- Ensure good contact with sensor
- Clean the sensor surface
- Try different finger

### Web App Issues

**"Web Serial API not supported"**
- Use Chrome or Edge browser (version 89+)
- Firefox and Safari don't support Web Serial API

**Can't see Arduino in port list**
- Arduino must be plugged in via USB
- Install Arduino drivers if on Windows
- Try a different USB port
- Check if another program has the serial port open

**Connected but no visualization**
- Check Arduino Serial Monitor first to verify data
- Look at browser console (F12) for errors
- Ensure finger is on sensor (check "F,1" in serial data)

**BPM showing "--"**
- Place finger firmly on sensor
- Wait 5-10 seconds for initial reading
- Ensure red LED on sensor is lit
- Check that "F,1" appears in serial output

## Advanced Customization

### Arduino Sketch

Edit these parameters in the Arduino code:

```cpp
const int STREAM_INTERVAL = 20;  // Data rate (ms), 20 = 50 Hz
```

### Web Visualizer

Modify `heartbeat_visualizer.html`:

```javascript
const WAVEFORM_SIZE = 512;      // Waveform buffer size
const FREQUENCY_BINS = 128;     // Frequency resolution
const PARTICLE_COUNT = 200;     // Number of particles
```

## Technical Details

### Data Flow

1. MAX30102 sensor measures infrared light absorption (blood flow)
2. Arduino detects heartbeat dips in IR signal
3. Calculates BPM from beat intervals
4. Streams normalized IR values (0-255) at 50 Hz
5. Web app receives data via Web Serial API
6. Visualizations render in real-time at 60 FPS

### Performance

- **Serial baud rate**: 115200 (reliable for USB)
- **Sensor sample rate**: 50 Hz (20ms intervals)
- **Visualization frame rate**: 60 FPS
- **Latency**: ~40-60ms end-to-end

## Credits

- **Sensor**: Maxim Integrated MAX30102
- **Visualizer design**: Based on clinical stethoscope visualizer
- **Arduino libraries**: SparkFun, Adafruit
- **Web Serial API**: Chrome/Edge implementation

## License

Experimental project for educational purposes.
