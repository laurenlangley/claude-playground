/*
 * Radio.pde
 *
 * THIS IS ANOTHER MISSING FILE FROM YOUR PROCESSING SKETCH!
 * This creates the radio buttons for serial port selection.
 *
 * To use this file:
 * 1. Copy this file to your Processing sketch folder
 * 2. Restart Processing
 */

class Radio {
  int x, y;
  int size, dotSize;
  color baseColor, selectColor, overColor;
  boolean over = false;
  boolean selected = false;
  int me;
  Radio[] radios;

  Radio(int ix, int iy, int isize, color ibaseColor, color iselectColor, color ioverColor, int iMe, Radio[] r) {
    x = ix;
    y = iy;
    size = isize;
    dotSize = size - size/3;
    baseColor = ibaseColor;
    selectColor = iselectColor;
    overColor = ioverColor;
    radios = r;
    me = iMe;
    radios[me] = this;
  }

  boolean overRadio(float mx, float my) {
    float disX = x - mx;
    float disY = y - my;
    if (sqrt(sq(disX) + sq(disY)) < size/2 ) {
      over = true;
      return true;
    } else {
      over = false;
      return false;
    }
  }

  void displayRadio() {
    noStroke();
    fill(baseColor);
    ellipse(x, y, size, size);
    if (selected) {
      fill(selectColor);
      ellipse(x, y, dotSize, dotSize);
    }
    if (over) {
      noFill();
      stroke(overColor);
      strokeWeight(2);
      ellipse(x, y, size, size);
      noStroke();
    }
  }

  void pressRadio(float mx, float my) {
    if (dist(x, y, mx, my) < size/2) {
      select();
    }
  }

  void select() {
    // Deselect all other radios
    for (int i = 0; i < radios.length; i++) {
      if (radios[i] != null) {
        radios[i].selected = false;
      }
    }
    // Select this one
    selected = true;

    // Handle port selection
    if (me < numPorts) {
      // Selected a serial port
      serialPort = serialPorts[me];
      try {
        if (port != null) {
          port.stop();
        }
        port = new Serial(this, serialPort, 115200);  // BAUD RATE SET HERE!
        port.bufferUntil('\n');
        serialPortFound = true;
        println("Connected to: " + serialPort);
      } catch (Exception e) {
        println("Error connecting to " + serialPort);
        serialPortFound = false;
      }
    } else {
      // Selected the refresh button
      refreshPorts = true;
    }
  }
}
