import { presets } from '../data';
import { LabelBadge } from './LabelBadge';

function sameValues(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

export function PresetPicker({
  onApply,
  current,
}: {
  onApply: (leverValues: Record<string, number>) => void;
  current: Record<string, number>;
}) {
  const selected = presets.presets.find((p) => sameValues(p.leverValues, current))?.id ?? 'custom';
  const chosen = presets.presets.find((p) => p.id === selected);
  return (
    <div className="lever" style={{ borderTop: 0, paddingTop: 0 }}>
      <label className="lever__title" htmlFor="preset-picker">
        Scenario
      </label>
      <select
        id="preset-picker"
        value={selected}
        onChange={(e) => {
          const preset = presets.presets.find((p) => p.id === e.target.value);
          if (preset) onApply(preset.leverValues);
        }}
        style={{ display: 'block', width: '100%', marginTop: 6, padding: '6px 8px' }}
      >
        {presets.presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {chosen ? (
        <p className="lever__desc">
          <LabelBadge badge={chosen.badge} /> {chosen.description}
        </p>
      ) : (
        <p className="lever__desc">Your own combination of assumptions.</p>
      )}
    </div>
  );
}
