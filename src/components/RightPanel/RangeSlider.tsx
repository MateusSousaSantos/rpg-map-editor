import type { CSSProperties } from "react";

/**
 * RangeSlider — a range input with a visible, accent-filled track.
 *
 * The unfilled `.opacity-slider` track reads as the panel background, so its
 * value is invisible. This wrapper computes the fill percentage from
 * min/max/value and exposes it to `.range-slider` (index.css) via a `--fill`
 * CSS variable so the track paints an accent bar up to the thumb.
 */
interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const RangeSlider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = "",
}: RangeSliderProps) => {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const style = { "--fill": `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={style}
      className={`range-slider w-full ${className}`}
    />
  );
};
