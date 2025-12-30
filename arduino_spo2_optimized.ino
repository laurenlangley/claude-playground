#include <Wire.h>
#include "MAX30105.h" // Include MAX30105 sensor library
#include "spo2_algorithm.h" // Include SpO2 calculation algorithm

MAX30105 particleSensor; // Create an instance of the MAX30105 class

// Uncomment for verbose debug output (uses more RAM)
// #define VERBOSE_OUTPUT

// Add this function to your code to check free RAM
int freeRam () {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

#define MAX_BRIGHTNESS 255 // Define maximum LED brightness

// Reduced buffer size for memory-constrained devices
#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega168__)
  #define BUFFER_SIZE 50  // Reduced from 100 to 50 for ATmega328P
  uint16_t irBuffer[BUFFER_SIZE]; // Buffer for IR data (16-bit)
  uint16_t redBuffer[BUFFER_SIZE]; // Buffer for red LED data
#else
  #define BUFFER_SIZE 100  // Keep 100 for devices with more memory
  uint32_t irBuffer[BUFFER_SIZE]; // Buffer for IR data (32-bit)
  uint32_t redBuffer[BUFFER_SIZE]; // Buffer for red LED data
#endif

int32_t bufferLength = BUFFER_SIZE; // Length of data buffer
int32_t spo2; // Variable to store calculated SpO2 value
int8_t validSPO2; // Flag indicating if SpO2 calculation is valid
int32_t heartRate; // Variable to store calculated heart rate
int8_t validHeartRate; // Flag indicating if heart rate calculation is valid

byte pulseLED = 11; // LED pin for pulse indication (must support PWM)
byte readLED = 13; // LED pin to indicate data read operation

void setup() {
  Serial.begin(115200); // Initialize serial communication
  pinMode(pulseLED, OUTPUT); // Set pulseLED as output
  pinMode(readLED, OUTPUT); // Set readLED as output

  // Initialize MAX30105 sensor
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(F("MAX30105 not found. Check wiring/power."));
    while (1); // Halt execution if sensor not found
  }

  Serial.println(F("Attach sensor to finger. Press key to start."));
  while (Serial.available() == 0); // Wait for user input to proceed
  Serial.read(); // Clear the serial buffer

  // Optimized sensor configuration for lower memory usage
  byte ledBrightness = 60; // LED brightness (0-255)
  byte sampleAverage = 4; // Averaging (1, 2, 4, 8, 16, 32)
  byte ledMode = 2; // LED mode (1=Red, 2=Red+IR, 3=Red+IR+Green)
  byte sampleRate = 100; // Sampling rate (50, 100, 200, 400, 800, 1000, 1600, 3200)
  int pulseWidth = 411; // Pulse width (69, 118, 215, 411)
  int adcRange = 4096; // ADC range (2048, 4096, 8192, 16384)

  // Apply configuration settings to the sensor
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  Serial.print(F("Free RAM: "));
  Serial.println(freeRam());
}

void loop() {
  // Collect initial samples
  for (byte i = 0; i < bufferLength; i++) {
    while (!particleSensor.available()) particleSensor.check(); // Wait for new data

    redBuffer[i] = particleSensor.getRed(); // Store red LED data
    irBuffer[i] = particleSensor.getIR(); // Store IR data
    particleSensor.nextSample(); // Move to next sample

    #ifdef VERBOSE_OUTPUT
    Serial.print(F("red="));
    Serial.print(redBuffer[i], DEC);
    Serial.print(F(", ir="));
    Serial.println(irBuffer[i], DEC);
    #endif
  }

  // Calculate heart rate and SpO2 from the initial samples
  maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);

  // Continuously update heart rate and SpO2 values with new samples
  byte sampleCounter = 0; // Counter for periodic output

  while (1) {
    // Calculate shift amounts based on buffer size
    byte shiftAmount = bufferLength / 4; // Shift 25% of buffer
    byte newSamples = bufferLength - shiftAmount;

    // Shift older samples to the beginning
    for (byte i = shiftAmount; i < bufferLength; i++) {
      redBuffer[i - shiftAmount] = redBuffer[i];
      irBuffer[i - shiftAmount] = irBuffer[i];
    }

    // Collect new samples to refill the buffer
    for (byte i = newSamples; i < bufferLength; i++) {
      while (!particleSensor.available()) particleSensor.check(); // Wait for new data

      digitalWrite(readLED, !digitalRead(readLED)); // Blink LED with each data read

      redBuffer[i] = particleSensor.getRed(); // Store new red data
      irBuffer[i] = particleSensor.getIR(); // Store new IR data
      particleSensor.nextSample(); // Move to next sample

      // Only output every 5th sample to reduce serial overhead
      sampleCounter++;
      if (sampleCounter >= 5) {
        sampleCounter = 0;

        #ifdef VERBOSE_OUTPUT
        Serial.print(F("red="));
        Serial.print(redBuffer[i], DEC);
        Serial.print(F(", ir="));
        Serial.print(irBuffer[i], DEC);
        Serial.print(F(", "));
        #endif

        Serial.print(F("HR="));
        Serial.print(heartRate, DEC);
        Serial.print(F(", HRvalid="));
        Serial.print(validHeartRate, DEC);
        Serial.print(F(", SPO2="));
        Serial.print(spo2, DEC);
        Serial.print(F(", SPO2Valid="));
        Serial.println(validSPO2, DEC);
      }
    }

    // Recalculate heart rate and SpO2 with the updated buffer
    maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);
  }
}
