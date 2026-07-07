# 🔮 Future Enhancement Ideas

Running list of things to add to the MAX30102 heart monitor. Check these off as we go!

- [x] ~~**Live waveform on the OLED**~~ — attempted (`MAX30102_OLED_Waveform.ino`),
      but parked: spike height reflects pulse *strength*, not BPM, so the trace
      didn't feel like it matched the reading. Sketch kept in the repo if we
      ever want to revisit with better shaping/smoothing.
- [ ] **SpO2 (blood oxygen %)** — the MAX30102 already has the red LED hardware for
      this; needs the red channel read + the ratio-of-ratios SpO2 calculation. Would
      display alongside BPM.
- [ ] **Go portable / wearable** — battery power + the OLED = a self-contained monitor
      with no computer attached. Could add a LiPo + charging board.

Other possibilities to consider later:
- [ ] Beat-to-beat variability (HRV) readout
- [ ] Min/max/session-average tracking
- [ ] Log readings to an SD card or over serial for graphing on a computer
