import { StepLink } from '../journey/links';

/**
 * What a choice says while another in the Budget counts the same money (Phase 25): you can’t have
 * both, what to untick to choose this one, why, and a one-tap swap; or, where a flagship the
 * player chose holds the other (Phase 26), a way back to that flagship instead. It is plain text
 * at full contrast, never faded. The control it belongs to stays in the tab order (aria-disabled,
 * not disabled) and points here with aria-describedby, so a keyboard or a screen reader hears why
 * it will not move and what to do instead.
 */
export function BlockedNotice({
  id,
  other,
  untick,
  reason,
  onSwap,
  flagship,
}: {
  id: string;
  /** What the other choice is called on screen. */
  other: string;
  /** Untick a toggle or a card; put a slider back. */
  untick: boolean;
  /** Why the two count the same money, as authored. */
  reason: string;
  /** Take the other out and put this one in, in one tap. */
  onSwap?: () => void;
  /** The other is held by a flagship the player chose: its title and its screen. */
  flagship?: { title: string; to: string };
}) {
  if (flagship) {
    return (
      <p className="blocked" id={id}>
        <strong>You can’t have both.</strong> “{other}” is in your flagship policies. {reason}{' '}
        <StepLink to={flagship.to}>
          Change it<span className="sr-only">: {flagship.title}</span>
        </StepLink>
      </p>
    );
  }
  return (
    <p className="blocked" id={id}>
      <strong>You can’t have both.</strong> {untick ? 'Untick' : 'Put back'} “{other}” to choose
      this. {reason}
      {onSwap ? (
        <>
          {' '}
          <button type="button" className="linklike blocked__swap" onClick={onSwap}>
            Swap them<span className="sr-only">: take out “{other}” and choose this</span>
          </button>
        </>
      ) : null}
    </p>
  );
}
