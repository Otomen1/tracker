type DraftState = { dirty: boolean; busy: boolean }
const guards = new Set<() => DraftState>()
export const BEFORE_NAVIGATION = "tracker-before-navigation"
export function registerDraftGuard(read: () => DraftState): () => void {
  guards.add(read)
  return () => { guards.delete(read) }
}
export function canLeaveScreen(): boolean {
  const drafts = Array.from(guards, read => read())
  if (drafts.some(draft => draft.busy)) return false
  if (drafts.some(draft => draft.dirty) && !window.confirm("Discard unsaved changes? Choose Cancel to keep editing.")) return false
  return window.dispatchEvent(new Event(BEFORE_NAVIGATION, { cancelable: true }))
}
