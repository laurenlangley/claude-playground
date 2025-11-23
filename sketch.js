let mic;
let fft;
let w;
let fade;
let hVal;
let rWidth, rHeight;
let audioStarted = false;
let statusMessage = "Initializing...";

function setup() {
    createCanvas(640, 480);
    console.log("Setup started");

    // Initialize audio input
    mic = new p5.AudioIn();
    console.log("AudioIn created:", mic);

    // Initialize FFT with 512 bins and 0.8 smoothing
    fft = new p5.FFT(0.8, 512);
    fft.setInput(mic);
    console.log("FFT initialized");

    // Calculate width for each frequency band
    // Using 63 bands to approximate logAverages(60, 7)
    w = width / 63;

    strokeWeight(w);
    strokeCap(SQUARE);

    background(0);
    fade = null; // Will be initialized in first draw

    rWidth = width * 0.99;
    rHeight = height * 0.99;
    hVal = 0;

    statusMessage = "Ready - Click button to start";
    console.log("Setup complete - waiting for user interaction");

    // Set up button interaction - try multiple methods
    let startButton = select('#startButton');
    if (startButton) {
        startButton.mousePressed(startAudio);
        console.log("Button event handler attached via p5.select");
    } else {
        console.error("Could not find button via p5.select");
    }

    // Also attach via vanilla JavaScript as backup
    let btn = document.getElementById('startButton');
    if (btn) {
        btn.addEventListener('click', startAudio);
        console.log("Button event handler attached via vanilla JS");
    } else {
        console.error("Could not find button via getElementById");
    }
}

function startAudio() {
    console.log("startAudio() called");

    if (!audioStarted) {
        console.log("Starting audio...");
        statusMessage = "Starting audio...";

        try {
            // Resume audio context
            userStartAudio().then(() => {
                console.log("Audio context resumed");

                // Start microphone with error handling
                mic.start(
                    // Success callback
                    () => {
                        console.log("Microphone started successfully");
                        audioStarted = true;
                        statusMessage = "Audio running";

                        // Hide button
                        let btn = select('#startButton');
                        if (btn) {
                            btn.addClass('hidden');
                        }

                        // Enable mic for FFT analysis
                        mic.amp(1.0);
                        console.log("Mic amplitude set, audio level:", mic.getLevel());
                    },
                    // Error callback
                    (err) => {
                        console.error("Error starting microphone:", err);
                        statusMessage = "Error: " + err.message;
                        alert("Could not access microphone. Please check permissions.\n\nError: " + err.message);
                    }
                );
            }).catch((err) => {
                console.error("Error resuming audio context:", err);
                statusMessage = "Error: " + err.message;
            });
        } catch (err) {
            console.error("Exception in startAudio:", err);
            statusMessage = "Exception: " + err.message;
        }
    } else {
        console.log("Audio already started");
    }
}

function draw() {
    background(0);

    // Show status message if audio not started
    if (!audioStarted) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(statusMessage, width / 2, height / 2);

        // Debug info
        textSize(12);
        text("Check browser console (F12) for debug info", width / 2, height / 2 + 30);
        return;
    }

    // Draw faded previous frame
    if (fade) {
        tint(255, 255, 255, 254);
        image(fade, (width - rWidth) / 2, (height - rHeight) / 2, rWidth, rHeight);
        noTint();
    }

    // Get frequency spectrum
    let spectrum = fft.analyze();

    // Log audio level for debugging (only occasionally to avoid console spam)
    if (frameCount % 60 === 0) {
        let level = mic.getLevel();
        console.log("Audio level:", level, "Spectrum max:", max(spectrum));
    }

    // Draw colored frequency bars
    colorMode(HSB);
    stroke(hVal, 255, 255);
    colorMode(RGB);

    // Use logarithmic averaging to group frequencies
    let numBands = 63;
    for (let i = 0; i < numBands; i++) {
        // Map bands logarithmically across the spectrum
        let start = int(map(i, 0, numBands, 0, spectrum.length / 2, true));
        let end = int(map(i + 1, 0, numBands, 0, spectrum.length / 2, true));

        // Average the frequencies in this band
        let sum = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
            sum += spectrum[j];
            count++;
        }
        let avg = count > 0 ? sum / count : 0;

        // Scale the amplitude
        let h = map(avg, 0, 255, 0, height);

        // Draw the line
        line((i * w) + (w / 2), height, (i * w) + (w / 2), height - h * 0.8);
    }

    // Capture current frame for fade effect
    fade = get();

    // Draw white frequency bars on top
    stroke(255);
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
        let h = map(avg, 0, 255, 0, height);

        line((i * w) + (w / 2), height, (i * w) + (w / 2), height - h * 0.8);
    }

    // Draw status indicator in corner
    fill(0, 255, 0);
    noStroke();
    ellipse(20, 20, 10, 10); // Green indicator when running

    // Increment hue value for color cycling
    hVal += 2;
    if (hVal > 255) {
        hVal = 0;
    }
}
