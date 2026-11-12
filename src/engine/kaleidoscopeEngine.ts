import { ColorPalette, OpticalConfig } from '../types/kaleidoscope';

const SOURCE_SIZE = 840;
const SOURCE_HALF = SOURCE_SIZE / 2;
const SOURCE_RADIUS = 390;
const TAU = Math.PI * 2;

type ShardShape = 'triangle' | 'diamond' | 'hexagon' | 'crescent' | 'orb' | 'arc';

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  radius: number;
  aspect: number;
  colorIndex: number;
  alpha: number;
  shape: ShardShape;
  layer: number; // 0 = back, 1 = mid, 2 = front highlight
}

interface NebulaBlob {
  orbitR: number;
  orbitSpeed: number;
  phase: number;
  size: number;
  colorIndex: number;
  wobbleFreq: number;
  wobbleAmp: number;
}

interface BrushPoint {
  x: number;
  y: number;
}

export class KaleidoscopeEngine {
  private sourceCanvas: HTMLCanvasElement;
  private sourceCtx: CanvasRenderingContext2D;

  private brushCanvas: HTMLCanvasElement;
  private brushCtx: CanvasRenderingContext2D;
  private brushHistory: ImageData[] = [];
  private lastBrushPoint: BrushPoint | null = null;
  private activeBrushStrokeColorIndex = 0;

  private shards: GlassShard[] = [];
  private blobs: NebulaBlob[] = [];

  private time = 0;
  private chamberAngle = 0;
  private internalSpin = 0;
  private angularVelocity = 0;
  private pointerInfluence = { x: 0, y: 0, active: false };

  constructor() {
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCanvas.width = SOURCE_SIZE;
    this.sourceCanvas.height = SOURCE_SIZE;
    const sCtx = this.sourceCanvas.getContext('2d');
    if (!sCtx) throw new Error('2D context unavailable');
    this.sourceCtx = sCtx;

    this.brushCanvas = document.createElement('canvas');
    this.brushCanvas.width = SOURCE_SIZE;
    this.brushCanvas.height = SOURCE_SIZE;
    const bCtx = this.brushCanvas.getContext('2d', { willReadFrequently: true });
    if (!bCtx) throw new Error('2D brush context unavailable');
    this.brushCtx = bCtx;

    this.initShards();
    this.initBlobs();
  }

  private initShards(): void {
    const shapes: ShardShape[] = ['triangle', 'diamond', 'hexagon', 'crescent', 'orb', 'arc'];
    this.shards = [];
    for (let i = 0; i < 68; i++) {
      const r = Math.sqrt(Math.random()) * (SOURCE_RADIUS * 0.9);
      const a = Math.random() * TAU;
      const layer = i < 20 ? 0 : i < 50 ? 1 : 2;
      this.shards.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 42,
        vy: (Math.random() - 0.5) * 42,
        angle: Math.random() * TAU,
        vAngle: (Math.random() - 0.5) * 1.4,
        radius: layer === 0 ? 34 + Math.random() * 38 : layer === 1 ? 16 + Math.random() * 24 : 8 + Math.random() * 14,
        aspect: 0.55 + Math.random() * 0.8,
        colorIndex: i % 8,
        alpha: layer === 0 ? 0.52 + Math.random() * 0.25 : 0.68 + Math.random() * 0.28,
        shape: shapes[i % shapes.length],
        layer,
      });
    }
  }

  private initBlobs(): void {
    this.blobs = [];
    for (let i = 0; i < 22; i++) {
      this.blobs.push({
        orbitR: 35 + (i / 22) * (SOURCE_RADIUS * 0.8),
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.18 + Math.random() * 0.42),
        phase: Math.random() * TAU,
        size: 65 + Math.random() * 115,
        colorIndex: i % 8,
        wobbleFreq: 1.2 + Math.random() * 2.2,
        wobbleAmp: 18 + Math.random() * 35,
      });
    }
  }

  public shake(strength = 1): void {
    for (const shard of this.shards) {
      const impulse = (110 + Math.random() * 190) * strength;
      const dir = Math.random() * TAU;
      shard.vx += Math.cos(dir) * impulse;
      shard.vy += Math.sin(dir) * impulse;
      shard.vAngle += (Math.random() - 0.5) * 5.2 * strength;
    }
    this.angularVelocity += (Math.random() > 0.5 ? 1 : -1) * 1.15 * strength;
  }

  public addManualAngularImpulse(deltaAngle: number): void {
    this.chamberAngle += deltaAngle;
    this.angularVelocity = deltaAngle * 42;
    // Transfer slight physical tumble to crystals when turning barrel manually
    for (const shard of this.shards) {
      const tangentX = -shard.y;
      const tangentY = shard.x;
      const dist = Math.hypot(shard.x, shard.y) || 1;
      shard.vx += (tangentX / dist) * deltaAngle * 140;
      shard.vy += (tangentY / dist) * deltaAngle * 140;
      shard.vAngle += deltaAngle * 1.4;
    }
  }

  public setPointerInfluence(nx: number, ny: number, active: boolean): void {
    this.pointerInfluence = { x: nx, y: ny, active };
  }

  public getChamberAngle(): number {
    return this.chamberAngle;
  }

  public setChamberAngle(angle: number): void {
    this.chamberAngle = angle;
  }

  // --- Brush Mode API ---
  public saveBrushSnapshot(): void {
    try {
      const snap = this.brushCtx.getImageData(0, 0, SOURCE_SIZE, SOURCE_SIZE);
      this.brushHistory.push(snap);
      if (this.brushHistory.length > 25) {
        this.brushHistory.shift();
      }
    } catch {
      // Ignore memory errors
    }
  }

  public undoBrush(): boolean {
    const snap = this.brushHistory.pop();
    if (!snap) return false;
    this.brushCtx.putImageData(snap, 0, 0);
    return true;
  }

  public clearBrush(): void {
    this.saveBrushSnapshot();
    this.brushCtx.clearRect(0, 0, SOURCE_SIZE, SOURCE_SIZE);
  }

  public hasBrushStrokes(): boolean {
    return this.brushHistory.length > 0;
  }

  private mapViewportToSource(
    px: number,
    py: number,
    targetWidth: number,
    targetHeight: number,
    config: OpticalConfig
  ): BrushPoint {
    const cx = targetWidth / 2;
    const cy = targetHeight / 2;
    const dx = px - cx;
    const dy = py - cy;

    const outerRadius = this.getOuterRadius(targetWidth, targetHeight, config);
    const scale = (outerRadius / 225) * config.zoom;
    const baseRotation = this.getEffectiveRotation(config);
    const wedgeAngle = TAU / config.segments;

    const rawAngle = Math.atan2(dy, dx) - baseRotation;
    const normA = ((rawAngle % TAU) + TAU) % TAU;
    const wedgeIndex = Math.floor(normA / wedgeAngle);
    let localA = normA - wedgeIndex * wedgeAngle;

    if (config.symmetryStyle === 'mirror' && wedgeIndex % 2 === 1) {
      localA = wedgeAngle - localA;
    }

    const sourceAngle = localA - this.internalSpin;
    const sourceR = Math.hypot(dx, dy) / scale;

    return {
      x: SOURCE_HALF + Math.cos(sourceAngle) * sourceR,
      y: SOURCE_HALF + Math.sin(sourceAngle) * sourceR,
    };
  }

  public beginBrushStroke(
    px: number,
    py: number,
    targetWidth: number,
    targetHeight: number,
    config: OpticalConfig,
    palette: ColorPalette
  ): void {
    this.saveBrushSnapshot();
    const pt = this.mapViewportToSource(px, py, targetWidth, targetHeight, config);
    this.lastBrushPoint = pt;

    if (config.brushColorIndex < 0) {
      this.activeBrushStrokeColorIndex =
        (this.activeBrushStrokeColorIndex + 1) % Math.max(1, palette.colors.length);
    } else {
      this.activeBrushStrokeColorIndex =
        config.brushColorIndex % Math.max(1, palette.colors.length);
    }

    this.stampBrushSegment(pt, pt, config, palette);
  }

  public continueBrushStroke(
    px: number,
    py: number,
    targetWidth: number,
    targetHeight: number,
    config: OpticalConfig,
    palette: ColorPalette
  ): void {
    const pt = this.mapViewportToSource(px, py, targetWidth, targetHeight, config);
    const prev = this.lastBrushPoint ?? pt;
    this.stampBrushSegment(prev, pt, config, palette);
    this.lastBrushPoint = pt;
  }

  public endBrushStroke(): void {
    this.lastBrushPoint = null;
  }

  private stampBrushSegment(
    from: BrushPoint,
    to: BrushPoint,
    config: OpticalConfig,
    palette: ColorPalette
  ): void {
    const color =
      palette.colors[this.activeBrushStrokeColorIndex % palette.colors.length] || '#FFFFFF';
    const ctx = this.brushCtx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, config.brushSize * 0.58);

    if (config.glowIntensity > 0.05) {
      ctx.shadowColor = color;
      ctx.shadowBlur = config.brushSize * (0.5 + config.glowIntensity);
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Inner bright core for optical glass ink look
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, config.brushSize * 0.16);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  // --- Simulation Update ---
  public step(rawDt: number, config: OpticalConfig): void {
    const dt = Math.min(rawDt, 0.05);

    if (config.playbackMode === 'auto' && config.isPlaying) {
      this.time += dt;
      this.chamberAngle += config.rotationSpeed * 0.42 * dt;
      this.internalSpin += config.rotationSpeed * 0.24 * dt;
    } else if (config.playbackMode === 'manual') {
      // Smooth inertial coasting after user drags
      if (Math.abs(this.angularVelocity) > 0.001) {
        this.chamberAngle += this.angularVelocity * dt;
        this.angularVelocity *= Math.pow(0.04, dt);
      } else {
        this.angularVelocity = 0;
      }
      if (config.isPlaying) {
        this.time += dt * 0.35;
      }
    }

    // Step shards physics
    const activeMotion =
      config.playbackMode === 'auto'
        ? config.isPlaying
          ? 1
          : 0
        : Math.min(1, Math.abs(this.angularVelocity) * 0.5 + (config.isPlaying ? 0.18 : 0));

    if (config.mode === 'stained-glass' && activeMotion > 0.001) {
      const turb = config.turbulence;
      for (let i = 0; i < this.shards.length; i++) {
        const s = this.shards[i];
        // Gentle swirl force + harmonic drift
        const r = Math.hypot(s.x, s.y) || 1;
        const swirlAngle = this.time * 0.55 + i * 0.37;
        const ax = Math.cos(swirlAngle) * 28 * turb - (s.y / r) * 14 * turb;
        const ay = Math.sin(swirlAngle) * 28 * turb + (s.x / r) * 14 * turb;

        if (this.pointerInfluence.active) {
          const px = this.pointerInfluence.x * SOURCE_RADIUS * 0.5;
          const py = this.pointerInfluence.y * SOURCE_RADIUS * 0.5;
          const dx = px - s.x;
          const dy = py - s.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 160) {
            s.vx += (dx / d) * 65 * dt;
            s.vy += (dy / d) * 65 * dt;
          }
        }

        s.vx = (s.vx + ax * dt) * Math.pow(0.55, dt);
        s.vy = (s.vy + ay * dt) * Math.pow(0.55, dt);
        s.x += s.vx * dt * activeMotion;
        s.y += s.vy * dt * activeMotion;
        s.angle += s.vAngle * dt * activeMotion;
        s.vAngle *= Math.pow(0.85, dt);

        // Soft circular chamber wall bounce
        const maxR = SOURCE_RADIUS - s.radius * 0.4;
        const dist = Math.hypot(s.x, s.y);
        if (dist > maxR) {
          const nx = s.x / dist;
          const ny = s.y / dist;
          s.x = nx * maxR;
          s.y = ny * maxR;
          const dot = s.vx * nx + s.vy * ny;
          if (dot > 0) {
            s.vx -= 1.75 * dot * nx;
            s.vy -= 1.75 * dot * ny;
          }
        }
      }
    }

    // Brush fade mode gently decays strokes over time
    if (config.mode === 'brush' && config.brushFade && (config.isPlaying || config.playbackMode === 'manual')) {
      this.brushCtx.save();
      this.brushCtx.globalCompositeOperation = 'destination-out';
      this.brushCtx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.06, dt * 0.45)})`;
      this.brushCtx.fillRect(0, 0, SOURCE_SIZE, SOURCE_SIZE);
      this.brushCtx.restore();
    }
  }

  private getEffectiveRotation(config: OpticalConfig): number {
    return config.playbackMode === 'manual'
      ? config.manualAngle + this.chamberAngle
      : this.chamberAngle;
  }

  private getOuterRadius(width: number, height: number, config: OpticalConfig): number {
    if (config.apertureStyle === 'circular') {
      return Math.min(width, height) * 0.46;
    }
    return Math.hypot(width / 2, height / 2) * 1.03;
  }

  // --- Source Chamber Renderers ---
  private renderSourceChamber(config: OpticalConfig, palette: ColorPalette): void {
    const ctx = this.sourceCtx;
    const colors = palette.colors.length > 0 ? palette.colors : ['#D4A853', '#1E7A8C', '#C83E4D'];

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SOURCE_SIZE, SOURCE_SIZE);

    if (config.mode === 'stained-glass') {
      this.drawStainedGlassChamber(ctx, config, colors);
    } else if (config.mode === 'nebula') {
      this.drawNebulaChamber(ctx, config, colors);
    } else if (config.mode === 'sacred-geometry') {
      this.drawSacredGeometryChamber(ctx, config, colors);
    } else if (config.mode === 'brush') {
      // Subtle faint guide grid on source backdrop + user strokes
      ctx.drawImage(this.brushCanvas, 0, 0);
    }

    ctx.restore();
  }

  private drawStainedGlassChamber(
    ctx: CanvasRenderingContext2D,
    config: OpticalConfig,
    colors: string[]
  ): void {
    ctx.save();
    ctx.translate(SOURCE_HALF, SOURCE_HALF);

    const activeCount = Math.max(
      14,
      Math.min(this.shards.length, Math.round(this.shards.length * (0.45 + config.complexity * 0.45)))
    );

    // Soft back-glow illumination
    const bgGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, SOURCE_RADIUS);
    bgGlow.addColorStop(0, this.hexWithAlpha(colors[0], 0.16 * (0.4 + config.glowIntensity)));
    bgGlow.addColorStop(0.55, this.hexWithAlpha(colors[1 % colors.length], 0.08));
    bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(0, 0, SOURCE_RADIUS, 0, TAU);
    ctx.fill();

    for (let i = 0; i < activeCount; i++) {
      const s = this.shards[i];
      const col = colors[s.colorIndex % colors.length];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      if (s.layer === 2 && config.glowIntensity > 0.1) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 18 * config.glowIntensity;
      }

      ctx.globalAlpha = s.alpha;

      if (s.shape === 'orb') {
        const grad = ctx.createRadialGradient(
          -s.radius * 0.25,
          -s.radius * 0.25,
          s.radius * 0.1,
          0,
          0,
          s.radius
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, col);
        grad.addColorStop(1, this.hexWithAlpha(col, 0.15));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, TAU);
        ctx.fill();
      } else if (s.shape === 'arc') {
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, s.radius * 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, Math.PI * 1.25);
        ctx.stroke();
      } else if (s.shape === 'crescent') {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0, TAU);
        ctx.arc(s.radius * 0.42, -s.radius * 0.12, s.radius * 0.78, 0, TAU, true);
        ctx.fill();
      } else {
        // Faceted polygonal crystal (triangle, diamond, hexagon)
        const sides = s.shape === 'triangle' ? 3 : s.shape === 'diamond' ? 4 : 6;
        ctx.beginPath();
        for (let v = 0; v < sides; v++) {
          const va = (v / sides) * TAU;
          const rx = Math.cos(va) * s.radius;
          const ry = Math.sin(va) * s.radius * (s.shape === 'diamond' ? s.aspect : 1);
          if (v === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(-s.radius, -s.radius, s.radius, s.radius);
        grad.addColorStop(0, col);
        grad.addColorStop(1, this.hexWithAlpha(col, 0.35));
        ctx.fillStyle = grad;
        ctx.fill();

        // Crisp bevel highlight edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Internal specular facet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s.radius * 0.85, 0);
        ctx.lineTo(
          Math.cos(TAU / sides) * s.radius * 0.85,
          Math.sin(TAU / sides) * s.radius * 0.85 * (s.shape === 'diamond' ? s.aspect : 1)
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawNebulaChamber(
    ctx: CanvasRenderingContext2D,
    config: OpticalConfig,
    colors: string[]
  ): void {
    ctx.save();
    ctx.translate(SOURCE_HALF, SOURCE_HALF);
    ctx.globalCompositeOperation = 'screen';

    const t = this.time * (0.65 + config.turbulence * 0.55);
    const blobCount = Math.max(8, Math.round(this.blobs.length * Math.min(1.2, config.complexity)));

    for (let i = 0; i < blobCount; i++) {
      const b = this.blobs[i % this.blobs.length];
      const col = colors[b.colorIndex % colors.length];
      const a = b.phase + t * b.orbitSpeed;
      const r = b.orbitR + Math.sin(t * b.wobbleFreq + b.phase) * b.wobbleAmp;
      const bx = Math.cos(a) * r;
      const by = Math.sin(a) * r;
      const rad = b.size * (0.75 + 0.3 * Math.sin(t * 1.1 + i));

      const grad = ctx.createRadialGradient(bx, by, 2, bx, by, rad);
      grad.addColorStop(0, this.hexWithAlpha(col, 0.55 + config.glowIntensity * 0.35));
      grad.addColorStop(0.45, this.hexWithAlpha(col, 0.24));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, TAU);
      ctx.fill();
    }

    // Flowing luminous silk filaments
    const ribbonCount = Math.max(4, Math.round(7 * config.complexity));
    for (let rIdx = 0; rIdx < ribbonCount; rIdx++) {
      const col = colors[(rIdx + 1) % colors.length];
      ctx.strokeStyle = this.hexWithAlpha(col, 0.32 + config.glowIntensity * 0.28);
      ctx.lineWidth = 2.5 + (rIdx % 3) * 1.6;
      ctx.beginPath();
      const baseAngle = (rIdx / ribbonCount) * TAU + t * 0.25;
      for (let step = 0; step <= 32; step++) {
        const u = step / 32;
        const rad = u * SOURCE_RADIUS * 0.92;
        const wave =
          Math.sin(u * 5.2 + t * 1.4 + rIdx) * (24 + config.turbulence * 26) +
          Math.cos(u * 9.0 - t * 0.9) * 12;
        const px = Math.cos(baseAngle + u * 1.4) * rad + Math.cos(baseAngle + 1.57) * wave;
        const py = Math.sin(baseAngle + u * 1.4) * rad + Math.sin(baseAngle + 1.57) * wave;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSacredGeometryChamber(
    ctx: CanvasRenderingContext2D,
    config: OpticalConfig,
    colors: string[]
  ): void {
    ctx.save();
    ctx.translate(SOURCE_HALF, SOURCE_HALF);

    const t = this.time * (0.45 + config.turbulence * 0.35);
    const rings = Math.max(3, Math.round(5 * config.complexity));

    // Subtle central radial glow
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, SOURCE_RADIUS);
    glow.addColorStop(0, this.hexWithAlpha(colors[0], 0.25 * (0.3 + config.glowIntensity)));
    glow.addColorStop(0.6, this.hexWithAlpha(colors[1 % colors.length], 0.08));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, SOURCE_RADIUS, 0, TAU);
    ctx.fill();

    for (let ring = 1; ring <= rings; ring++) {
      const ratio = ring / rings;
      const baseR = ratio * SOURCE_RADIUS * 0.88;
      const col = colors[ring % colors.length];
      const nextCol = colors[(ring + 1) % colors.length];
      const spin = t * (ring % 2 === 0 ? 0.45 : -0.35);

      ctx.save();
      ctx.rotate(spin);

      // Concentric orbital circle
      ctx.strokeStyle = this.hexWithAlpha(col, 0.55);
      ctx.lineWidth = 1.6;
      if (ring % 2 === 0) {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // Petal / Vesica arcs around the ring
      const petals = 6 + ring * 2;
      const petalR = (baseR * 0.38) * (0.85 + 0.15 * Math.sin(t * 1.3 + ring));
      for (let p = 0; p < petals; p++) {
        const a = (p / petals) * TAU;
        const px = Math.cos(a) * baseR * 0.72;
        const py = Math.sin(a) * baseR * 0.72;

        ctx.strokeStyle = this.hexWithAlpha(nextCol, 0.52);
        ctx.fillStyle = this.hexWithAlpha(col, 0.11);
        ctx.lineWidth = 1.4;
        if (config.glowIntensity > 0.2) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 10 * config.glowIntensity;
        }
        ctx.beginPath();
        ctx.arc(px, py, petalR, 0, TAU);
        ctx.fill();
        ctx.stroke();

        // Nodal jewel dot
        ctx.shadowBlur = 0;
        ctx.fillStyle = nextCol;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * baseR, Math.sin(a) * baseR, 3.5, 0, TAU);
        ctx.fill();
      }

      // Star polygon chord lattice
      const vertices = 5 + (ring % 4);
      ctx.strokeStyle = this.hexWithAlpha(col, 0.65);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let v = 0; v <= vertices; v++) {
        const idx = (v * 2) % vertices;
        const va = (idx / vertices) * TAU;
        const vx = Math.cos(va) * baseR;
        const vy = Math.sin(va) * baseR;
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  // --- Optical Mirror Projection ---
  public renderToCanvas(
    targetCanvas: HTMLCanvasElement,
    config: OpticalConfig,
    palette: ColorPalette
  ): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // 1. Update internal source chamber once per render
    this.renderSourceChamber(config, palette);

    // 2. Clear target canvas with deep optical backdrop
    ctx.save();
    ctx.fillStyle = config.apertureStyle === 'circular' ? '#06070A' : palette.background;
    ctx.fillRect(0, 0, width, height);

    const outerRadius = this.getOuterRadius(width, height, config);
    const segments = Math.max(4, config.segments);
    const wedgeAngle = TAU / segments;
    const scale = (outerRadius / 225) * config.zoom;
    const baseRotation = this.getEffectiveRotation(config);

    // Optional circular optical eyepiece clipping
    if (config.apertureStyle === 'circular') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, TAU);
      ctx.clip();
      ctx.fillStyle = palette.background;
      ctx.fillRect(cx - outerRadius, cy - outerRadius, outerRadius * 2, outerRadius * 2);
    }

    // 3. Project N mirrored wedges
    const primaryClipR = config.radialRingMirror ? outerRadius * 0.66 : outerRadius + 4;
    this.drawWedgeRing(
      ctx,
      cx,
      cy,
      segments,
      wedgeAngle,
      primaryClipR,
      baseRotation,
      this.internalSpin,
      scale,
      config.symmetryStyle === 'mirror',
      false
    );

    // 4. Optional Outer Radial Ring Reflection (double-tier fractal mandala)
    if (config.radialRingMirror) {
      const innerRing = outerRadius * 0.64;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + 4, 0, TAU);
      ctx.arc(cx, cy, innerRing, 0, TAU, true);
      ctx.clip();

      this.drawWedgeRing(
        ctx,
        cx,
        cy,
        segments,
        wedgeAngle,
        outerRadius + 4,
        baseRotation + wedgeAngle * 0.5,
        -this.internalSpin * 0.8,
        scale * 1.15,
        config.symmetryStyle === 'mirror',
        true,
        innerRing
      );
      ctx.restore();

      // Subtle optical ring junction highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = Math.max(1, width * 0.0012);
      ctx.beginPath();
      ctx.arc(cx, cy, innerRing, 0, TAU);
      ctx.stroke();
    }

    // 5. Optical lens finishing vignette & brass eyepiece rim
    if (config.apertureStyle === 'circular') {
      const lensVignette = ctx.createRadialGradient(
        cx,
        cy,
        outerRadius * 0.72,
        cx,
        cy,
        outerRadius
      );
      lensVignette.addColorStop(0, 'rgba(0,0,0,0)');
      lensVignette.addColorStop(0.86, 'rgba(0,0,0,0.22)');
      lensVignette.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = lensVignette;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, TAU);
      ctx.fill();

      ctx.restore(); // End circular clip

      // Subtle brushed brass optical barrel bezel
      const rimWidth = Math.max(2, outerRadius * 0.012);
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.42)';
      ctx.lineWidth = rimWidth;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + rimWidth * 0.4, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + rimWidth * 1.4, 0, TAU);
      ctx.stroke();
    } else {
      // Subtle edge vignette for full-bleed prints/wallpapers
      const edgeVig = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(width, height) * 0.25,
        cx,
        cy,
        outerRadius
      );
      edgeVig.addColorStop(0, 'rgba(0,0,0,0)');
      edgeVig.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = edgeVig;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private drawWedgeRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    segments: number,
    wedgeAngle: number,
    clipR: number,
    baseRotation: number,
    spin: number,
    scale: number,
    mirror: boolean,
    invertRadial: boolean,
    ringPivot = 0
  ): void {
    const overlap = 0.0045;
    for (let i = 0; i < segments; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(baseRotation + i * wedgeAngle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, clipR, -overlap, wedgeAngle + overlap);
      ctx.closePath();
      ctx.clip();

      if (mirror && i % 2 === 1) {
        ctx.rotate(wedgeAngle / 2);
        ctx.scale(1, -1);
        ctx.rotate(-wedgeAngle / 2);
      }

      if (invertRadial && ringPivot > 0) {
        const bisector = wedgeAngle / 2;
        ctx.translate(
          Math.cos(bisector) * ringPivot * 1.85,
          Math.sin(bisector) * ringPivot * 1.85
        );
        ctx.rotate(Math.PI);
      }

      ctx.rotate(spin);
      ctx.scale(scale, scale);
      ctx.drawImage(this.sourceCanvas, -SOURCE_HALF, -SOURCE_HALF);
      ctx.restore();
    }
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return `rgba(255,255,255,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }
}
