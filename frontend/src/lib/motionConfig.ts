// Centralized motion timing/easing (Requirement 4 timing guidance). Every
// motion primitive in src/components/motion/ pulls from here instead of
// components inventing their own durations/easings ad hoc.
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const DURATION = {
  micro: 0.18, // 120-220ms band
  route: 0.28, // 180-350ms band
  reveal: 0.5, // 300-650ms band
} as const;

export const STAGGER_GAP = 0.06; // short gap so the last item never feels delayed
