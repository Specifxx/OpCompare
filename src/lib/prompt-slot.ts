// ONE self-opening prompt a visit (owner, 2026-11-23: "at most once per session"; page budget: one prompt per visit). The first
// card that opens on its own claims the visit's slot in sessionStorage; every other self-opening card asks first and stands down.
// A card the visitor opens themselves (a button) needs no slot. Storage refused: nothing self-opens (fail quiet).
export const PROMPT_SLOT_KEY = "oc_prompt_slot";

/** Who holds this visit's slot, or null when it is free. "blocked" when storage cannot be read. */
export function promptSlotHolder(): string | null {
  try {
    return sessionStorage.getItem(PROMPT_SLOT_KEY);
  } catch {
    return "blocked";
  }
}

/** Takes the slot for `who`; true when it was free (or already `who`'s). */
export function claimPromptSlot(who: string): boolean {
  try {
    const cur = sessionStorage.getItem(PROMPT_SLOT_KEY);
    if (cur && cur !== who) return false;
    sessionStorage.setItem(PROMPT_SLOT_KEY, who);
    return true;
  } catch {
    return false;
  }
}
