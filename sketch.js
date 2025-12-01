let mic;
let fft;
let w;
let fade;
let hVal;
let rWidth, rHeight;
let audioStarted = false;
let statusMessage = "Initializing...";
let workletError = false;

// Audio device selection
let audioDevices = [];
let selectedDeviceId = null;
let deviceSelector;

// Filters
let lowPass, highPass;
let filterEnabled = true;

// View modes
let showWaveform = false; // Toggle between waveform and spectrum
let monitoring = false; // Audio playback monitoring

// Gain controls (from Processing code)
let inputGain = 20.0;
let visualGain = 100.0;
let monitorGain = 2.0;

// Enhanced heartbeat detection with BPM
let peakThreshold = 0.05;
let lastPeakTime = 0;
let lastPeakValue = 0;
let bpm = 0;
let smoothedBPM = 0;
let recentBPMs = [];
let maxBPMHistory = 5;

// Heartbeat timing constraints (30-200 BPM)
let minBeatInterval = 300;  // 200 BPM max
let maxBeatInterval = 2000; // 30 BPM min

// Audio monitoring
let heartbeatOsc;
let heartbeatEnv;
let soundEnabled = false;

// UI controls
let inputGainSlider, visualGainSlider, thresholdSlider, volumeSlider;

// Catch worklet loading errors
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message &&
        event.reason.message.includes('worklet')) {
        console.warn("AudioWorklet failed to load. This is expected when opening HTML directly.");
        console.warn("Solution: Run './start-server.sh' and open http://localhost:8000");
        workletError = true;
        statusMessage = "Please use local server - see console";
        event.preventDefault();
    }
});

function setup() {
    createCanvas(640, 480);
    console.log("=== DIGITAL STETHOSCOPE MODE (p5.js) ===");
    console.log("Enhanced heartbeat detection with BPM calculation");
    console.log();

    // Initialize audio input
    mic = new p5.AudioIn();
    console.log("AudioIn created");

    // Initialize FFT with larger buffer for better low-frequency detection
    fft = new p5.FFT(0.8, 1024);
    fft.setInput(mic);

    // Initialize filters
    lowPass = new p5.LowPass();
    lowPass.freq(200); // Focus on heartbeat frequencies
    lowPass.res(0.5);

    highPass = new p5.HighPass();
    highPass.freq(20); // Remove rumble/DC offset
    highPass.res(0.5);

    // Calculate bar width
    w = width / 63;
    strokeWeight(w);
    strokeCap(SQUARE);

    background(0);
    fade = null;

    rWidth = width * 0.99;
    rHeight = height * 0.99;
    hVal = 0;

    statusMessage = "Ready - Select device and start";

    // Create UI controls
    setupUI();

    console.log();
    console.log("KEYBOARD CONTROLS:");
    console.log("  M - Toggle audio monitoring");
    console.log("  W - Toggle waveform/spectrum view");
    console.log("  F - Toggle low-pass filter");
    console.log("  R - Reset all settings to defaults");
    console.log();
}

function setupUI() {
    let yPos = height + 10;

    // Device selector
    createP('Audio Input Device:').position(10, yPos).style('color', 'white');
    deviceSelector = createSelect();
    deviceSelector.position(10, yPos + 30);
    deviceSelector.style('width', '250px');
    deviceSelector.option('Loading devices...', '');
    deviceSelector.changed(() => {
        selectedDeviceId = deviceSelector.value();
        console.log("Device selected:", deviceSelector.elt.options[deviceSelector.elt.selectedIndex].text);
        if (audioStarted) {
            restartAudioWithDevice();
        }
    });

    // Refresh button
    let refreshBtn = createButton('🔄 Refresh');
    refreshBtn.position(270, yPos + 30);
    refreshBtn.mousePressed(() => enumerateAudioDevices());

    yPos += 70;

    // Input Gain slider
    createP('Input Gain:').position(10, yPos).style('color', 'white');
    inputGainSlider = createSlider(1, 200, inputGain, 1);
    inputGainSlider.position(10, yPos + 30);
    inputGainSlider.style('width', '200px');
    inputGainSlider.input(() => {
        inputGain = inputGainSlider.value();
    });

    // Visual Gain slider
    createP('Visual Gain:').position(220, yPos).style('color', 'white');
    visualGainSlider = createSlider(1, 500, visualGain, 10);
    visualGainSlider.position(220, yPos + 30);
    visualGainSlider.style('width', '200px');
    visualGainSlider.input(() => {
        visualGain = visualGainSlider.value();
    });

    yPos += 70;

    // Peak Threshold slider
    createP('Peak Threshold:').position(10, yPos).style('color', 'white');
    thresholdSlider = createSlider(0.001, 0.5, peakThreshold, 0.001);
    thresholdSlider.position(10, yPos + 30);
    thresholdSlider.style('width', '200px');
    thresholdSlider.input(() => {
        peakThreshold = thresholdSlider.value();
    });

    // Output Volume slider
    createP('Monitor Volume:').position(220, yPos).style('color', 'white');
    volumeSlider = createSlider(0, 1, monitorGain / 10, 0.01);
    volumeSlider.position(220, yPos + 30);
    volumeSlider.style('width', '200px');
    volumeSlider.input(() => {
        monitorGain = volumeSlider.value() * 10;
    });

    yPos += 70;

    // Toggle buttons
    let soundBtn = createButton('Enable Heartbeat Sound');
    soundBtn.position(10, yPos + 30);
    soundBtn.mousePressed(() => {
        soundEnabled = !soundEnabled;
        soundBtn.html(soundEnabled ? 'Disable Heartbeat Sound' : 'Enable Heartbeat Sound');
        if (soundEnabled) {
            initHeartbeat();
        } else {
            stopHeartbeat();
        }
    });

    let viewBtn = createButton('Switch to Waveform');
    viewBtn.position(200, yPos + 30);
    viewBtn.mousePressed(() => {
        showWaveform = !showWaveform;
        viewBtn.html(showWaveform ? 'Switch to Spectrum' : 'Switch to Waveform');
    });

    let filterBtn = createButton('Disable Filter');
    filterBtn.position(360, yPos + 30);
    filterBtn.mousePressed(() => {
        filterEnabled = !filterEnabled;
        filterBtn.html(filterEnabled ? 'Disable Filter' : 'Enable Filter');
        if (filterEnabled) {
            mic.connect(lowPass);
            lowPass.process(mic);
        } else {
            mic.disconnect();
        }
        console.log("Filter:", filterEnabled ? "ON" : "OFF");
    });

    // Start button
    let startButton = select('#startButton');
    if (startButton) {
        startButton.mousePressed(startAudio);
    }

    // Enumerate devices
    enumerateAudioDevices();
}

async function startAudio() {
    console.log("Starting audio...");
    if (!audioStarted) {
        try {
            await userStartAudio();

            let constraints = {
                audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mic.setSource(stream);

            mic.start(
                () => {
                    console.log("✅ Microphone started successfully");
                    audioStarted = true;
                    statusMessage = "Audio running";

                    let btn = select('#startButton');
                    if (btn) btn.addClass('hidden');

                    mic.amp(1.0);

                    // Apply filters
                    if (filterEnabled) {
                        mic.connect(highPass);
                        highPass.connect(lowPass);
                        lowPass.disconnect();
                        fft.setInput(lowPass);
                    }

                    console.log("Ready to detect heartbeats!");
                },
                (err) => {
                    console.error("❌ Error:", err);
                    alert("Could not access microphone: " + err.message);
                }
            );
        } catch (err) {
            console.error("❌ Exception:", err);
            alert("Could not access selected device: " + err.message);
        }
    }
}

async function enumerateAudioDevices() {
    try {
        console.log("=== ENUMERATING AUDIO DEVICES ===");
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        audioDevices = allDevices.filter(device => device.kind === 'audioinput');

        console.log("Found", audioDevices.length, "audio input devices");

        deviceSelector.html('');

        audioDevices.forEach((device, index) => {
            let label = device.label || `Microphone ${index + 1}`;
            console.log(`  ${index}: ${label}`);
            deviceSelector.option(label, device.deviceId);

            if (index === 0 && !selectedDeviceId) {
                selectedDeviceId = device.deviceId;
            }
        });

        console.log("=== END DEVICE ENUMERATION ===");
    } catch (err) {
        console.error("❌ Error enumerating devices:", err);
    }
}

async function restartAudioWithDevice() {
    try {
        console.log("Switching to selected device...");

        let constraints = {
            audio: { deviceId: { exact: selectedDeviceId } }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (mic.stream) {
            mic.stream.getTracks().forEach(track => track.stop());
        }

        mic.stream = stream;
        fft.setInput(mic);

        console.log("✅ Device switched successfully");
    } catch (err) {
        console.error("❌ Error switching device:", err);
        alert("Could not switch device: " + err.message);
    }
}

function initHeartbeat() {
    stopHeartbeat();

    heartbeatOsc = new p5.Oscillator('triangle');
    heartbeatOsc.amp(0);
    heartbeatOsc.freq(60);
    heartbeatOsc.start();

    heartbeatEnv = new p5.Envelope();
    heartbeatEnv.setADSR(0.01, 0.15, 0.0, 0.1);
    heartbeatEnv.setRange(monitorGain / 10, 0);

    console.log("Heartbeat synthesizer initialized");
}

function stopHeartbeat() {
    if (heartbeatOsc) {
        heartbeatOsc.stop();
        heartbeatOsc = null;
    }
    heartbeatEnv = null;
}

function playHeartbeat(intensity) {
    if (!heartbeatOsc || !heartbeatEnv) return;

    let volume = map(intensity, peakThreshold, 0.5, 0.2, 1.0, true);
    volume = constrain(volume * monitorGain / 10, 0, 1.0);

    let freq = map(intensity, peakThreshold, 0.5, 50, 80, true);
    heartbeatOsc.freq(freq);

    heartbeatEnv.setRange(volume, 0);
    heartbeatEnv.play(heartbeatOsc);
}

function detectHeartbeat() {
    if (!audioStarted) return;

    let rawLevel = mic.getLevel();
    let amplifiedLevel = rawLevel * inputGain;

    let currentTime = millis();
    let timeSinceLastBeat = currentTime - lastPeakTime;

    // Improved peak detection
    let isPeak = amplifiedLevel > peakThreshold &&
                 amplifiedLevel > lastPeakValue * 0.8 &&
                 timeSinceLastBeat > minBeatInterval;

    if (isPeak && timeSinceLastBeat < maxBeatInterval) {
        // Calculate BPM from interval
        let instantBPM = 60000.0 / timeSinceLastBeat;

        if (instantBPM >= 30 && instantBPM <= 200) {
            recentBPMs.push(instantBPM);

            if (recentBPMs.length > maxBPMHistory) {
                recentBPMs.shift();
            }

            // Calculate smoothed BPM
            let sum = 0;
            for (let b of recentBPMs) {
                sum += b;
            }
            smoothedBPM = sum / recentBPMs.length;
            bpm = smoothedBPM;

            console.log("💓 HEARTBEAT! Instant:", nf(instantBPM, 0, 1), "| Smoothed:", nf(smoothedBPM, 0, 1), "BPM");

            // Play heartbeat sound
            if (soundEnabled) {
                playHeartbeat(amplifiedLevel);
            }
        }

        lastPeakTime = currentTime;
        lastPeakValue = amplifiedLevel;
    }

    // Decay last peak value
    lastPeakValue *= 0.95;

    // Debug logging
    if (frameCount % 60 === 0) {
        console.log("Raw:", nf(rawLevel, 0, 6), "| Amp:", nf(amplifiedLevel, 0, 4), "| Threshold:", nf(peakThreshold, 0, 3));
    }
}

function draw() {
    background(0);

    if (!audioStarted) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(statusMessage, width / 2, height / 2);
        textSize(12);
        text("Check browser console (F12) for debug info", width / 2, height / 2 + 30);
        return;
    }

    // Detect heartbeat
    detectHeartbeat();

    if (showWaveform) {
        // Draw waveform view
        drawWaveform();
    } else {
        // Draw spectrum view
        drawSpectrum();
    }

    // Draw UI overlays
    drawStatusIndicators();
    drawLevelMeter();
    drawBPMDisplay();
}

function drawWaveform() {
    let waveform = fft.waveform();

    // Draw centerline
    stroke(100);
    strokeWeight(1);
    line(0, height/2, width, height/2);

    // Draw waveform
    stroke(0, 255, 0);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
        let x = map(i, 0, waveform.length, 0, width);
        let y = height/2 + waveform[i] * inputGain * 100;
        vertex(x, y);
    }
    endShape();

    // Draw threshold line
    stroke(255, 0, 0);
    let thresholdY = height/2 - (peakThreshold / inputGain) * 100 * inputGain;
    line(0, thresholdY, width, thresholdY);
}

function drawSpectrum() {
    // Draw faded previous frame
    if (fade) {
        tint(255, 255, 255, 254);
        image(fade, (width - rWidth) / 2, (height - rHeight) / 2, rWidth, rHeight);
        noTint();
    }

    let spectrum = fft.analyze();

    // Draw colored frequency bars
    colorMode(HSB);
    stroke(hVal, 255, 255);
    colorMode(RGB);
    strokeWeight(w);

    let numBands = 63;
    for (let i = 0; i < numBands; i++) {
        let start = int(map(i, 0, numBands, 0, spectrum.length / 2, true));
        let end = int(map(i + 1, 0, numBands, 0, spectrum.length / 2, true));

        let sum = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
            sum += spectrum[j];
            count++;
        }
        let avg = count > 0 ? sum / count : 0;
        let barHeight = avg * visualGain / 100;

        line((i * w) + (w / 2), height, (i * w) + (w / 2), height - barHeight);
    }

    fade = get();

    // Update hue
    hVal += 2;
    if (hVal > 255) {
        hVal = 0;
    }
}

function drawStatusIndicators() {
    noStroke();

    // Running indicator (green)
    fill(0, 255, 0);
    ellipse(10, 10, 10, 10);

    // Mode indicators
    fill(255);
    textSize(11);
    text("View: " + (showWaveform ? "WAVEFORM" : "SPECTRUM") + " | Filter: " + (filterEnabled ? "ON" : "OFF"), 25, 15);
}

function drawLevelMeter() {
    let rawLevel = mic.getLevel();
    let amplifiedLevel = rawLevel * inputGain;

    let meterY = height - 40;
    let meterWidth = width - 20;

    // Background
    stroke(100);
    noFill();
    rect(10, meterY, meterWidth, 20);

    // Level bar
    noStroke();
    if (amplifiedLevel > peakThreshold) {
        fill(255, 0, 0);
    } else {
        fill(0, 255, 0);
    }
    let levelWidth = constrain(amplifiedLevel * meterWidth, 0, meterWidth);
    rect(10, meterY, levelWidth, 20);

    // Threshold marker
    fill(255, 255, 0);
    let thresholdX = 10 + peakThreshold * meterWidth;
    triangle(thresholdX, meterY - 5, thresholdX - 5, meterY, thresholdX + 5, meterY);

    // Level text
    fill(255);
    textSize(10);
    text("Level: " + nf(amplifiedLevel, 0, 4) + " (Threshold: " + nf(peakThreshold, 0, 3) + ")", 10, meterY - 5);
}

function drawBPMDisplay() {
    if (bpm > 0) {
        textSize(32);
        fill(255, 0, 0);
        text("♥ " + nf(bpm, 0, 0) + " BPM", width - 150, 40);

        // Flash on beat
        if (millis() - lastPeakTime < 100) {
            fill(255, 0, 0, 100);
            ellipse(width - 30, 25, 40, 40);
        }
    }
}

function keyPressed() {
    if (key === 'm' || key === 'M') {
        monitoring = !monitoring;
        console.log("Audio monitoring:", monitoring ? "ON" : "OFF");
    }
    else if (key === 'w' || key === 'W') {
        showWaveform = !showWaveform;
        console.log("View mode:", showWaveform ? "WAVEFORM" : "SPECTRUM");
    }
    else if (key === 'f' || key === 'F') {
        filterEnabled = !filterEnabled;
        console.log("Filter:", filterEnabled ? "ON" : "OFF");
    }
    else if (key === 'r' || key === 'R') {
        inputGain = 20.0;
        visualGain = 100.0;
        monitorGain = 2.0;
        peakThreshold = 0.05;
        inputGainSlider.value(inputGain);
        visualGainSlider.value(visualGain);
        thresholdSlider.value(peakThreshold);
        console.log("=== RESET TO DEFAULTS ===");
    }
}
