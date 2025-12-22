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

  boolean pressRadio(float mx, float my) {
    if (dist(x, y, mx, my) < size/2) {
      select();
      return true;
    }
    return false;
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
      // Selected a serial port - set the port name
      // The main sketch will handle actually opening the connection
      serialPort = serialPorts[me];
      serialPortFound = true;
    } else {
      // Selected the refresh button
      refreshPorts = true;
    }
  }
}
