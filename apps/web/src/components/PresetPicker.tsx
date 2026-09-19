import { presets } from '../data';
import { sameValues } from '../journey/values';
import { LabelBadge } from './LabelBadge';

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
    <div className="lever lever--flush">
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
        className="lever__select"
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
