import { Shaper, BAND_COUNT } from './shaper.ts';
import { Drone, type ChordQuality } from './drone.ts';
import { OutputChain } from './output.ts';
import type { NoiseKind } from '../dsp/noise.ts';

export interface CpuReport {
  /** Estimated mean time spent in the noise worklet's process() call, in ms. */
  msPerQuantum: number;
  /** Wall-clock duration of one render quantum: the hard budget. */
  budgetMs: number;
  /** Number of quanta the estimate is averaged over. */
  quanta: number;
  /** Peak sample magnitude out of the generator, before the shaper. */
  sourcePeak: number;
}

export interface EngineState {
  kind: NoiseKind;
  bands: number[];
  correlation: number;
  driftDepth: number;
  driftRate: number;
  level: number;
  droneOn: boolean;
  droneLevel: number;
  droneRoot: number;
  droneQuality: ChordQuality;
  droneAmDepth: number;
}

export const DEFAULT_STATE: EngineState = {
  kind: 'pink',
  bands: new Array(BAND_COUNT).fill(0),
  correlation: 0.7,
  driftDepth: 0,
  driftRate: 0.25,
  level: 0.4,
  droneOn: false,
  droneLevel: 0.3,
  droneRoot: 45, // A2
  droneQuality: 'min7',
  droneAmDepth: 0,
};

export class Engine {
  ctx: AudioContext | null = null;
  shaper: Shaper | null = null;
  drone: Drone | null = null;
  output: OutputChain | null = null;
  private noiseNode: AudioWorkletNode | null = null;
  private driftNode: AudioWorkletNode | null = null;
  private state: EngineState = structuredClone(DEFAULT_STATE);
  running = false;
  /** Audio-thread cost, reported once a second from the noise worklet. */
  onCpu: ((report: CpuReport) => void) | null = null;

  getState(): EngineState {
    return structuredClone(this.state);
  }

  /**
   * Must be called from a user gesture. Browsers create the context in
   * `suspended` and only a gesture-initiated resume() will start it; we also
   * re-check on every start because the context can be suspended again later
   * (notably by iOS Safari when the page is backgrounded).
   */
  async start(): Promise<void> {
    if (!this.ctx) await this.build();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume();
    this.drone!.start(ctx.currentTime);
    this.output!.fadeIn();
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.output) return;
    this.running = false;
    await this.output.fadeOut();
  }

  private async build(): Promise<void> {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    this.ctx = ctx;

    await Promise.all([
      ctx.audioWorklet.addModule(new URL('worklets/noise-processor.js', document.baseURI).href),
      ctx.audioWorklet.addModule(new URL('worklets/drift-processor.js', document.baseURI).href),
    ]);

    this.noiseNode = new AudioWorkletNode(ctx, 'noise-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    this.driftNode = new AudioWorkletNode(ctx, 'drift-processor', {
      numberOfInputs: 0,
      numberOfOutputs: BAND_COUNT,
      outputChannelCount: new Array(BAND_COUNT).fill(1),
    });

    this.shaper = new Shaper(ctx);
    this.output = new OutputChain(ctx);
    this.drone = new Drone(ctx, { rootMidi: this.state.droneRoot, quality: this.state.droneQuality });

    this.noiseNode.port.onmessage = (e: MessageEvent) => {
      const d = e.data as CpuReport & { type: string };
      if (d.type === 'cpu') this.onCpu?.(d);
    };

    this.noiseNode.connect(this.shaper.input);
    this.shaper.output.connect(this.output.bus);
    this.drone.output.connect(this.output.bus);
    this.shaper.connectDrift(this.driftNode);

    this.applyAll();
  }

  private applyAll(): void {
    const s = this.state;
    this.setKind(s.kind);
    this.shaper!.setAll(s.bands);
    this.setCorrelation(s.correlation);
    this.setDrift(s.driftDepth, s.driftRate);
    this.output!.setLevel(s.level);
    this.setDroneLevel(s.droneOn ? s.droneLevel : 0);
    this.drone!.setAmDepth(s.droneAmDepth);
  }

  setKind(kind: NoiseKind): void {
    this.state.kind = kind;
    this.noiseNode?.port.postMessage({ type: 'kind', kind });
  }

  setBand(i: number, db: number): void {
    this.state.bands[i] = db;
    this.shaper?.setBand(i, db);
  }

  setBands(dbs: number[]): void {
    this.state.bands = dbs.slice();
    this.shaper?.setAll(dbs);
  }

  setCorrelation(rho: number): void {
    this.state.correlation = rho;
    const p = this.noiseNode?.parameters.get('correlation');
    if (p && this.ctx) p.setTargetAtTime(rho, this.ctx.currentTime, 0.05);
  }

  setDrift(depthDb: number, rate: number): void {
    this.state.driftDepth = depthDb;
    this.state.driftRate = rate;
    if (!this.driftNode || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.driftNode.parameters.get('depth')?.setTargetAtTime(depthDb, t, 0.2);
    this.driftNode.parameters.get('rate')?.setTargetAtTime(rate, t, 0.2);
  }

  setLevel(level: number): void {
    this.state.level = level;
    this.output?.setLevel(level);
  }

  setDroneOn(on: boolean): void {
    this.state.droneOn = on;
    this.setDroneLevel(on ? this.state.droneLevel : 0);
  }

  setDroneLevel(linear: number): void {
    if (this.state.droneOn) this.state.droneLevel = linear;
    if (this.drone && this.ctx) this.drone.setLevel(linear, this.ctx.currentTime, 0.4);
  }

  setDroneChord(rootMidi: number, quality: ChordQuality): void {
    this.state.droneRoot = rootMidi;
    this.state.droneQuality = quality;
    this.drone?.setChord(rootMidi, quality);
  }

  setDroneAmDepth(depth: number): void {
    this.state.droneAmDepth = depth;
    this.drone?.setAmDepth(depth);
  }

  loadState(s: EngineState): void {
    this.state = structuredClone(s);
    if (this.ctx) {
      this.drone?.setChord(s.droneRoot, s.droneQuality);
      this.applyAll();
    }
  }
}
