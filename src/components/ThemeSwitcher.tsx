import { useId } from 'react';
import type { ThemeId } from '@/content/types';
import { useTheme } from '@/lib/theme';
import { themes } from '@/lib/themes';

/**
 * Native select on purpose: it is keyboard operable, screen-reader labelled,
 * renders its current value, and needs no custom focus management.
 */
export function ThemeSwitcher({ variant = 'header' }: { variant?: 'header' | 'mobile' }) {
  const { theme, setTheme } = useTheme();
  const id = useId();

  return (
    <div className={`theme-switcher theme-switcher--${variant}`}>
      <label className="theme-switcher__label" htmlFor={id}>
        Theme
      </label>
      <select
        id={id}
        className="theme-switcher__select"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        aria-describedby={`${id}-hint`}
      >
        {themes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="sr-only">
        Changes the appearance of this site for you only. Saved on this device.
      </span>
    </div>
  );
}
