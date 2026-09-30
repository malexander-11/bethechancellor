import type { InteractionNotice } from '@btc/engine';

export function InteractionsNotice({ interactions }: { interactions: InteractionNotice[] }) {
  if (interactions.length === 0) return null;
  return (
    <div className="interactions" role="note">
      <div className="interactions__title">These settings interact</div>
      <ul>
        {interactions.map((i) => (
          <li
            key={i.leverIds.join('|')}
            className={i.severity !== 'info' ? 'interactions__warn' : ''}
          >
            <strong>
              {i.severity === 'excludes'
                ? 'Counted twice: '
                : i.severity === 'warn'
                  ? 'Warning: '
                  : ''}
              {i.titles[0]} and {i.titles[1]}:
            </strong>{' '}
            {i.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
