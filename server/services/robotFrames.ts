import fs from 'fs';
import path from 'path';

export type RobotVariant = 'dominical' | 'pointing' | 'pointing-glasses';

const templateCache = new Map<RobotVariant, string>();

const TEMPLATE_PATHS: Record<RobotVariant, string> = {
  dominical: path.resolve(process.cwd(), 'public/robly-avatar/robly-dominical.svg'),
  pointing: path.resolve(process.cwd(), 'public/robly-avatar/robly-pointing.svg'),
  'pointing-glasses': path.resolve(process.cwd(), 'public/robly-avatar/robly-pointing-glasses.svg'),
};

/** Native SVG canvas size per variant (dominical is square, pointing/pointing-glasses are wide to fit the whiteboard). */
export const VARIANT_NATIVE_SIZE: Record<RobotVariant, { width: number; height: number }> = {
  dominical: { width: 500, height: 500 },
  pointing: { width: 900, height: 500 },
  'pointing-glasses': { width: 900, height: 500 },
};

// Vertical pivot the mouth's talking scaleY is centered on, in the template's
// own coordinate space. Matches each SVG's own `.mouth{transform-origin}` —
// the "pointing-glasses" variant moved its mouth down 8px so it clears the
// glasses' lenses, so its pivot moved too (218 -> 226).
const MOUTH_PIVOT_Y: Record<RobotVariant, number> = {
  dominical: 218,
  pointing: 218,
  'pointing-glasses': 226,
};

function loadTemplate(variant: RobotVariant): string {
  const cached = templateCache.get(variant);
  if (cached !== undefined) return cached;
  const content = fs.readFileSync(TEMPLATE_PATHS[variant], 'utf-8');
  templateCache.set(variant, content);
  return content;
}

export interface RobotPose {
  bodyTranslateY: number;
  ringScale: number;
  ringOpacity: number;
  haloScale: number;
  haloOpacity: number;
  eyesScaleY: number;
  armRotateDeg: number;
  mouthScaleY: number;
}

interface KeyframeStop {
  pct: number;
  value: number;
}

/**
 * Newton-Raphson solver for the CSS default `ease-in-out` timing function,
 * cubic-bezier(0.42, 0, 0.58, 1). Replicates browser CSS animation easing
 * without a browser — this is what lets frames be computed statically.
 */
function bezierComponent(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

function bezierDerivative(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

const EASE_P1X = 0.42;
const EASE_P2X = 0.58;
const EASE_P1Y = 0;
const EASE_P2Y = 1;

export function cubicBezierEaseInOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const d = bezierDerivative(t, EASE_P1X, EASE_P2X);
    if (Math.abs(d) < 1e-6) break;
    t -= (bezierComponent(t, EASE_P1X, EASE_P2X) - x) / d;
    t = Math.min(1, Math.max(0, t));
  }
  return bezierComponent(t, EASE_P1Y, EASE_P2Y);
}

/** Interpolates a CSS-keyframes-style stop list at a given phase (0-100). */
export function interpolateKeyframes(stops: KeyframeStop[], progressPct: number): number {
  const p = ((progressPct % 100) + 100) % 100;
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].pct && p <= stops[i + 1].pct) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  if (upper.pct === lower.pct) return lower.value;
  const localT = (p - lower.pct) / (upper.pct - lower.pct);
  return lower.value + (upper.value - lower.value) * cubicBezierEaseInOut(localT);
}

function phasePct(tSeconds: number, periodSeconds: number): number {
  return ((tSeconds % periodSeconds) / periodSeconds) * 100;
}

// Mirrors the @keyframes in public/robly-avatar/robly-dominical.svg exactly.
const BODY_FLOAT_PERIOD = 3.2;
const RING_PULSE_PERIOD = 3.2;
const HALO_PULSE_PERIOD = 2.4;
const BLINK_PERIOD = 4.6;
const WAVE_PERIOD = 2.2;
const MOUTH_PERIOD = 0.38;
const MOUTH_CLOSED_SCALE_Y = 0.35;

const BODY_FLOAT_Y: KeyframeStop[] = [{ pct: 0, value: 0 }, { pct: 50, value: -9 }, { pct: 100, value: 0 }];
const RING_SCALE: KeyframeStop[] = [{ pct: 0, value: 1 }, { pct: 50, value: 1.06 }, { pct: 100, value: 1 }];
const RING_OPACITY: KeyframeStop[] = [{ pct: 0, value: 0.85 }, { pct: 50, value: 1 }, { pct: 100, value: 0.85 }];
const HALO_SCALE: KeyframeStop[] = [{ pct: 0, value: 0.85 }, { pct: 50, value: 1.25 }, { pct: 100, value: 0.85 }];
const HALO_OPACITY: KeyframeStop[] = [{ pct: 0, value: 0.5 }, { pct: 50, value: 1 }, { pct: 100, value: 0.5 }];
const BLINK_SCALE_Y: KeyframeStop[] = [
  { pct: 0, value: 1 }, { pct: 44, value: 1 }, { pct: 47, value: 0.08 }, { pct: 50, value: 1 }, { pct: 100, value: 1 },
];
const WAVE_ROTATE: KeyframeStop[] = [
  { pct: 0, value: 0 }, { pct: 25, value: -10 }, { pct: 50, value: 5 }, { pct: 75, value: -7 }, { pct: 100, value: 0 },
];
// "pointing" variant: arm-r holds a steady point instead of waving, so this
// is a much smaller nudge (see robly-pointing.svg's `point` keyframes).
const POINT_ROTATE: KeyframeStop[] = [
  { pct: 0, value: 0 }, { pct: 30, value: -4 }, { pct: 60, value: 2 }, { pct: 100, value: 0 },
];

interface ArmAnimConfig {
  keyframes: KeyframeStop[];
  period: number;
}

const ARM_ANIM: Record<RobotVariant, ArmAnimConfig> = {
  dominical: { keyframes: WAVE_ROTATE, period: WAVE_PERIOD },
  pointing: { keyframes: POINT_ROTATE, period: 1.8 },
  'pointing-glasses': { keyframes: POINT_ROTATE, period: 1.8 },
};
const MOUTH_SCALE_Y: KeyframeStop[] = [
  { pct: 0, value: MOUTH_CLOSED_SCALE_Y }, { pct: 22, value: 1 }, { pct: 45, value: 0.5 },
  { pct: 68, value: 1.15 }, { pct: 100, value: MOUTH_CLOSED_SCALE_Y },
];

/**
 * Computes every animated part's pose at a given instant. The mouth only
 * advances through its talking cycle while `isSpeaking` is true — otherwise
 * it's held closed, so the robot's mouth visibly starts/stops with the
 * narration audio instead of flapping mechanically for the whole video.
 */
export function computeRobotPose(
  tSeconds: number,
  isSpeaking: boolean,
  variant: RobotVariant = 'dominical'
): RobotPose {
  const arm = ARM_ANIM[variant];
  return {
    bodyTranslateY: interpolateKeyframes(BODY_FLOAT_Y, phasePct(tSeconds, BODY_FLOAT_PERIOD)),
    ringScale: interpolateKeyframes(RING_SCALE, phasePct(tSeconds, RING_PULSE_PERIOD)),
    ringOpacity: interpolateKeyframes(RING_OPACITY, phasePct(tSeconds, RING_PULSE_PERIOD)),
    haloScale: interpolateKeyframes(HALO_SCALE, phasePct(tSeconds, HALO_PULSE_PERIOD)),
    haloOpacity: interpolateKeyframes(HALO_OPACITY, phasePct(tSeconds, HALO_PULSE_PERIOD)),
    eyesScaleY: interpolateKeyframes(BLINK_SCALE_Y, phasePct(tSeconds, BLINK_PERIOD)),
    armRotateDeg: interpolateKeyframes(arm.keyframes, phasePct(tSeconds, arm.period)),
    mouthScaleY: isSpeaking
      ? interpolateKeyframes(MOUTH_SCALE_Y, phasePct(tSeconds, MOUTH_PERIOD))
      : MOUTH_CLOSED_SCALE_Y,
  };
}

function fmt(n: number): string {
  return n.toFixed(3);
}

function replaceOnce(svg: string, marker: string, replacement: string): string {
  if (!svg.includes(marker)) {
    throw new Error(
      `robly-dominical.svg template drifted — expected marker not found: ${marker.slice(0, 60)}...`
    );
  }
  return svg.replace(marker, replacement);
}

/**
 * Bakes a computed pose into a static copy of the avatar SVG. Each animated
 * part's transform-origin is replicated manually as translate(pivot) op
 * translate(-pivot) — SVG rasterizers don't need to run the (unused)
 * @keyframes CSS at all, they just render whatever transform/opacity
 * attributes are set here.
 */
export function renderRobotFrameSvg(pose: RobotPose, variant: RobotVariant = 'dominical'): string {
  let svg = loadTemplate(variant);

  svg = replaceOnce(
    svg,
    '<g class="base-ring ">',
    `<g class="base-ring " transform="translate(250,424) scale(${fmt(pose.ringScale)}) translate(-250,-424)" opacity="${fmt(pose.ringOpacity)}">`
  );

  svg = replaceOnce(
    svg,
    '<g class="robot-anim">',
    `<g class="robot-anim" transform="translate(0,${fmt(pose.bodyTranslateY)})">`
  );

  svg = replaceOnce(
    svg,
    '<circle cx="250" cy="36" r="20" fill="url(#ringGlow)" class="antenna-halo"/>',
    `<circle cx="250" cy="36" r="20" fill="url(#ringGlow)" class="antenna-halo" transform="translate(250,36) scale(${fmt(pose.haloScale)}) translate(-250,-36)" opacity="${fmt(pose.haloOpacity)}"/>`
  );

  svg = replaceOnce(
    svg,
    '<g class="eyes" fill="none" stroke="url(#cyanGrad)" stroke-width="12" stroke-linecap="round" filter="url(#glow)">',
    `<g class="eyes" fill="none" stroke="url(#cyanGrad)" stroke-width="12" stroke-linecap="round" filter="url(#glow)" transform="translate(250,190) scale(1,${fmt(pose.eyesScaleY)}) translate(-250,-190)">`
  );

  const mouthPivotY = MOUTH_PIVOT_Y[variant];
  svg = replaceOnce(
    svg,
    '<g class="mouth">',
    `<g class="mouth" transform="translate(250,${mouthPivotY}) scale(1,${fmt(pose.mouthScaleY)}) translate(-250,-${mouthPivotY})">`
  );

  svg = replaceOnce(
    svg,
    '<g class="arm-r">',
    `<g class="arm-r" transform="rotate(${fmt(pose.armRotateDeg)} 345 315)">`
  );

  return svg;
}
