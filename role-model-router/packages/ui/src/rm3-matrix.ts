/**
 * R8 RM3 behaviour matrix. One row per required dimension; each row names the maintained test that
 * proves it (see packages/foldkit/test/s652-rm3-behavior-matrix.scene.test.ts and s12b/s12c/s13b).
 *
 * Reduced motion is owned by the stylesheet's prefers-reduced-motion block, not by component state;
 * the Foldkit primitives carry no animation lifecycle. cn merge is intentionally plain concatenation
 * (see foldkit-button.ts:134-138) rather than the donor tailwind-merge behaviour.
 */
export const RM3_BEHAVIOR_MATRIX = {
  light: "s652 light wrapper: button/input semantics unchanged",
  dark: "s652 dark wrapper: button/input semantics unchanged",
  mobile: "s652 block button at the 390px mobile width",
  keyboardFocus: "s652 focus-visible outline and Enter/Space through s12b/s12c",
  rtl: "s652 dir=rtl wrapper keeps labels and references",
  disabled: "s652/s12b/s12c native disabled and aria-disabled",
  reducedMotion: "no animation lifecycle; stylesheet prefers-reduced-motion",
  overlay: "s653 dialog aria-labelledby/close and cancel->RequestedClose",
  cnMerge: "plain concatenation: caller class is kept, not tailwind-merge",
} as const;
