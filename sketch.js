let mic;
let fft;
let w;
let fade;
let hVal;
let rWidth, rHeight;
let audioStarted = false;

function setup() {
    createCanvas(640, 480);

    // Initialize audio input
    mic = new p5.AudioIn();

    // Initialize FFT with 512 bins and 0.8 smoothing
    fft = new p5.FFT(0.8, 512);
    fft.setInput(mic);

    // Calculate width for each frequency band
    // Using 63 bands to approximate logAverages(60, 7)
    w = width / 63;

    strokeWeight(w);
    strokeCap(SQUARE);

    background(0);
    fade = createImage(width, height);
    fade.copy(get(), 0, 0, width, height, 0, 0, width, height);

    rWidth = width * 0.99;
    rHeight = height * 0.99;
    hVal = 0;

    // Set up button interaction
    let startButton = select('#startButton');
    startButton.mousePressed(startAudio);
}

function startAudio() {
    if (!audioStarted) {
        userStartAudio();
        mic.start();
        audioStarted = true;
        select('#startButton').addClass('hidden');
    }
}

function draw() {
    background(0);

    if (!audioStarted) {
        return;
    }

    // Draw faded previous frame
    tint(255, 255, 255, 254);
    image(fade, (width - rWidth) / 2, (height - rHeight) / 2, rWidth, rHeight);
    noTint();

    // Get frequency spectrum
    let spectrum = fft.analyze();

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
    fade.copy(get(), 0, 0, width, height, 0, 0, width, height);

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

    // Increment hue value for color cycling
    hVal += 2;
    if (hVal > 255) {
        hVal = 0;
    }
}
