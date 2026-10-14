interface FirstRunStateProps {
  onLoadDemo: () => void;
  onCreateBoard: () => void;
}

interface EmptyPageStateProps {
  onCreateBoard: () => void;
}

function EmptyIllustration() {
  return (
    <svg className="empty-state__illustration" viewBox="0 0 120 84" aria-hidden="true">
      <rect x="11" y="17" width="42" height="52" rx="8" />
      <rect x="67" y="25" width="42" height="44" rx="8" />
      <path d="M21 31h22M21 40h16M77 39h22M77 48h14" />
      <circle cx="59" cy="17" r="10" />
      <path d="M59 12v10M54 17h10" />
    </svg>
  );
}

export function FirstRunState({ onLoadDemo, onCreateBoard }: FirstRunStateProps) {
  return (
    <section className="empty-state empty-state--first-run" aria-labelledby="first-run-title">
      <EmptyIllustration />
      <span className="empty-state__eyebrow">WELCOME TO BOARDS</span>
      <h2 id="first-run-title">Your boards are empty.</h2>
      <p>Start with a ready-made workspace, or create one board and make it yours.</p>
      <div className="empty-state__actions">
        <button className="button button--primary" type="button" onClick={onLoadDemo}>Load demo data</button>
        <button className="button button--ghost" type="button" onClick={onCreateBoard}>Create your first board</button>
      </div>
      <small>Your data stays in this browser.</small>
    </section>
  );
}

export function EmptyPageState({ onCreateBoard }: EmptyPageStateProps) {
  return (
    <section className="empty-state empty-state--page" aria-labelledby="empty-page-title">
      <span className="empty-state__small-icon" aria-hidden="true">□</span>
      <div>
        <h2 id="empty-page-title">This page has no boards yet.</h2>
        <p>Create a board here, or switch to another page.</p>
      </div>
      <button className="button button--primary" type="button" onClick={onCreateBoard}>Create a board</button>
    </section>
  );
}
