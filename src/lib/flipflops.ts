export type FFType = 'SR' | 'JK' | 'D' | 'T'

export interface FFState {
  Q: 0 | 1
  Qbar: 0 | 1
}

export function nextFF(
  type: FFType,
  Q: 0 | 1,
  inputs: { S?: 0 | 1; R?: 0 | 1; J?: 0 | 1; K?: 0 | 1; D?: 0 | 1; T?: 0 | 1 },
): { next: FFState; note: string; invalid?: boolean } {
  const Qbar = (1 - Q) as 0 | 1
  switch (type) {
    case 'SR': {
      const S = inputs.S ?? 0
      const R = inputs.R ?? 0
      if (S && R) return { next: { Q, Qbar }, note: 'Illegal: S=R=1 (race / forbidden)', invalid: true }
      if (S) return { next: { Q: 1, Qbar: 0 }, note: 'Set → Q=1' }
      if (R) return { next: { Q: 0, Qbar: 1 }, note: 'Reset → Q=0' }
      return { next: { Q, Qbar }, note: 'Hold (memory)' }
    }
    case 'JK': {
      const J = inputs.J ?? 0
      const K = inputs.K ?? 0
      if (!J && !K) return { next: { Q, Qbar }, note: 'Hold' }
      if (J && !K) return { next: { Q: 1, Qbar: 0 }, note: 'Set' }
      if (!J && K) return { next: { Q: 0, Qbar: 1 }, note: 'Reset' }
      return { next: { Q: Qbar, Qbar: Q }, note: 'Toggle (J=K=1)' }
    }
    case 'D': {
      const D = inputs.D ?? 0
      return { next: { Q: D, Qbar: (1 - D) as 0 | 1 }, note: `Q follows D → ${D}` }
    }
    case 'T': {
      const T = inputs.T ?? 0
      if (!T) return { next: { Q, Qbar }, note: 'Hold (T=0)' }
      return { next: { Q: Qbar, Qbar: Q }, note: 'Toggle (T=1)' }
    }
  }
}

export const FF_META: Record<
  FFType,
  { title: string; blurb: string; inputs: string[]; characteristic: string }
> = {
  SR: {
    title: 'SR latch / FF',
    blurb: 'Set–Reset. Forbidden when S=R=1.',
    inputs: ['S', 'R'],
    characteristic: 'Q⁺ = S + R\'Q   (S·R ≠ 1)',
  },
  JK: {
    title: 'JK flip-flop',
    blurb: 'No illegal state — J=K=1 toggles.',
    inputs: ['J', 'K'],
    characteristic: 'Q⁺ = JQ\' + K\'Q',
  },
  D: {
    title: 'D flip-flop',
    blurb: 'Data / delay — samples D on clock edge.',
    inputs: ['D'],
    characteristic: 'Q⁺ = D',
  },
  T: {
    title: 'T flip-flop',
    blurb: 'Toggle — building block of binary counters.',
    inputs: ['T'],
    characteristic: 'Q⁺ = T⊕Q',
  },
}
