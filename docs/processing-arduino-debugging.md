# Processing-Arduino Communication Debug Guide

## Your Processing Code Expectations

Your Processing visualizer expects **specific serial data format** from Arduino. Here's what it needs:

### Expected Serial Format

The Processing code uses `serialEvent()` to read data. Looking at your code, it needs:

```
'S' + Sensor value (int)
'B' + BPM value (int)
'Q' + IBI value (int)
```

**CRITICAL**: The Processing code is looking for these specific characters followed by integer values!

## Common Issues & Quick Checks

### Issue 1: No Heartbeat Visualization

**Symptoms:**
- Processing window opens
- Port connects
- But no heartbeat shows

**Most Likely Causes:**
1. ❌ Arduino not sending data in the correct format
2. ❌ Serial port mismatch
3. ❌ Baud rate mismatch
4. ❌ Sensor not detecting pulse

### Step-by-Step Debug Process

#### Step 1: Verify Serial Connection
```
1. Open Processing sketch
2. Select your Arduino port from the list
3. Check Processing console (bottom black area) for errors
```

#### Step 2: Check Arduino Serial Output
```
1. Close Processing completely (IMPORTANT!)
2. Open Arduino IDE
3. Open Serial Monitor (Tools > Serial Monitor)
4. Set baud rate to match Arduino code (usually 115200 for Pulse Sensor)
5. Watch for data streaming
```

**What you should see:**
```
S512
B0
Q0
S515
B0
Q0
...
```

If you see this, Arduino is working! Problem is in Processing communication.

If you DON'T see this, problem is in Arduino code or sensor.

#### Step 3: Verify Data Format

Your Arduino MUST send data like this:
```arduino
Serial.print('S');
Serial.println(Signal);  // Send sensor value

// When beat is detected:
Serial.print('B');
Serial.println(BPM);     // Send BPM

Serial.print('Q');
Serial.println(IBI);     // Send Inter-Beat Interval
```

## Debugging Checklist

- [ ] Arduino is connected via USB
- [ ] Correct COM port selected in Processing
- [ ] Baud rates match in Arduino and Processing code
- [ ] Arduino Serial Monitor shows data (when Processing is CLOSED)
- [ ] Sensor wires connected: Red→5V, Black→GND, Purple→A0
- [ ] Finger placed on sensor (gentle pressure)
- [ ] Arduino code sends 'S', 'B', 'Q' characters
- [ ] Processing console shows no errors

## Expected Baud Rate

**Standard Pulse Sensor code uses:** `115200` baud

Check your Processing code for:
```processing
void setupSerial() {
  // Look for this line in the serialEvent tab or setup
  port = new Serial(this, serialPort, 115200);  // <-- This number
}
```

## Testing Serial Communication

### Test 1: Echo Test
Upload this simple Arduino sketch to test serial:

```arduino
void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.print('S');
  Serial.println(512);

  Serial.print('B');
  Serial.println(75);

  Serial.print('Q');
  Serial.println(800);

  delay(20);
}
```

**Expected Result:** Processing should show a flat line at 512 and steady BPM of 75.

If this works, your Arduino pulse sensor code has an issue.
If this doesn't work, there's a Processing/serial port issue.

## Finding Your Processing SerialEvent Code

Your Processing sketch should have additional tabs. Look for:
- `serialEvent.pde` tab
- `PulseSensorAmped_Processing_Visualizer.pde` (or similar)

The `serialEvent` function is WHERE Processing reads Arduino data.

## Next Steps

1. **Share your Arduino code** - I need to see exactly what it's sending
2. **Check for all Processing tabs** - There might be a serialEvent tab
3. **Try the echo test above** - This will isolate Arduino vs Processing issues
4. **Report what you see in Serial Monitor** - This tells us if Arduino is working

## Troubleshooting by Symptom

### "Select Your Serial Port" screen won't go away
- ❌ Processing can't connect to Arduino
- ✓ Try different port from list
- ✓ Unplug/replug Arduino
- ✓ Close any other programs using serial port

### Processing connects but windows are empty
- ❌ No data being received
- ✓ Check baud rate matches
- ✓ Look for errors in Processing console
- ✓ Verify Arduino is sending data (use Serial Monitor)

### Flat line, no pulse wave
- ❌ Receiving 'S' data but it's constant
- ✓ Check sensor wiring
- ✓ Verify finger is on sensor
- ✓ Check sensor LED is lit
- ✓ Verify analogRead() in Arduino code

### Pulse wave shows but BPM is 0
- ❌ Receiving 'S' but not 'B' or 'Q'
- ✓ Arduino isn't detecting beats
- ✓ Threshold may be wrong
- ✓ Check beat detection algorithm
