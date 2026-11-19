import { Fragment, useId } from 'react';
import { t } from '../../i18n/id';

const BRAND = t.appName; // 'ℤ-Math'
const SUFFIX = BRAND.slice(1); // '-Math'

/**
 * The double-struck ℤ drawn as a bold SVG glyph. None of the app fonts (Plus Jakarta Sans,
 * Inter) contain U+2124, so typing ℤ as text would fall back to a thin system serif.
 * The glyph follows the text colour (currentColor), sits on the baseline at cap height and
 * matches the logo: two bars, a diagonal band, and thin "double-struck" cuts.
 */
function ZGlyph() {
  const mask = `zglyph-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 50 60"
      aria-hidden="true"
      focusable="false"
      className="inline-block h-[0.72em] w-[0.64em] shrink-0 align-baseline"
      // the hyphen in Plus Jakarta Sans already has side space; no extra gap after the ℤ
    >
      <defs>
        <mask id={mask}>
          <rect width="50" height="60" fill="#fff" />
          {/* thin "double-struck" cuts, kept narrow so the letter stays as heavy as the text */}
          <path d="M40 15.5 L11 44.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <path d="M8.5 3.5 V10 M41.5 50 V56.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${mask})`}>
        <rect x="2" y="0" width="46" height="13.5" rx="2.5" />
        <rect x="2" y="46.5" width="46" height="13.5" rx="2.5" />
        <path d="M29 13 H48 L21 47 H2 Z" />
      </g>
    </svg>
  );
}

/**
 * "ℤ-Math" with a crisp bold ℤ, in the surrounding font. Pass `font-brand font-extrabold`
 * only for the app title (Masuk, Beranda header, Profil subtitle). Screen readers read "ℤ-Math".
 */
export function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap ${className}`}>
      <span className="sr-only">{BRAND}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        <ZGlyph />
        {SUFFIX}
      </span>
    </span>
  );
}

/** Text that may contain "ℤ-Math" (e.g. "Pasang ℤ-Math"): the brand part gets BrandName. */
export function BrandText({ text, brandClassName }: { text: string; brandClassName?: string }) {
  const parts = text.split(BRAND);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <BrandName className={brandClassName} />}
        </Fragment>
      ))}
    </>
  );
}
