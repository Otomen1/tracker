// Pure decision for the transaction form's description-default behavior.
// A description is still eligible for auto-fill from the selected category
// when it is empty, or when it exactly matches the last value this same
// logic auto-filled (i.e. the user hasn't diverged from it since). Once the
// user types anything else, `lastAuto` stops matching and the description is
// permanently treated as manual until cleared back to empty.
export function shouldAutoFillDescription(current: string, lastAuto: string | null): boolean {
  return current === "" || (lastAuto !== null && current === lastAuto)
}
