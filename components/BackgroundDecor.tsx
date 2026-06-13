/**
 * Fixed, non-interactive decorative graphics behind all page content.
 * Everything is stroke-only and very low opacity so it reads as
 * "etched into the table" rather than competing with content.
 */
export function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Fanned card trio — top right, drifting off-canvas */}
      <svg
        className="absolute -right-24 -top-20 hidden h-[420px] w-[420px] text-accent-700 opacity-[0.05] md:block"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="60" y="30" width="80" height="112" rx="8" transform="rotate(-14 100 86)" />
        <rect x="60" y="30" width="80" height="112" rx="8" transform="rotate(2 100 86)" />
        <rect x="60" y="30" width="80" height="112" rx="8" transform="rotate(18 100 86)" />
        {/* art box on the front card */}
        <rect x="70" y="44" width="60" height="44" rx="3" transform="rotate(18 100 86)" opacity="0.6" />
      </svg>

      {/* Mana constellation — bottom left pentagon */}
      <svg
        className="absolute -bottom-16 -left-16 hidden h-[380px] w-[380px] text-sand-600 opacity-[0.06] lg:block"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        {/* pentagon edges */}
        <path d="M100 30 L167 79 L141 158 L59 158 L33 79 Z" />
        {/* inner pentagram */}
        <path d="M100 30 L141 158 L33 79 L167 79 L59 158 Z" opacity="0.5" />
        {/* mana nodes */}
        <circle cx="100" cy="30" r="9" fill="#efe8dc" />
        <circle cx="167" cy="79" r="9" fill="#efe8dc" />
        <circle cx="141" cy="158" r="9" fill="#efe8dc" />
        <circle cx="59" cy="158" r="9" fill="#efe8dc" />
        <circle cx="33" cy="79" r="9" fill="#efe8dc" />
      </svg>

      {/* Sparkles — scattered four-point stars */}
      <svg
        className="absolute left-[12%] top-[28%] h-5 w-5 text-accent-500 opacity-[0.12]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
      </svg>
      <svg
        className="absolute right-[18%] top-[55%] h-3.5 w-3.5 text-accent-600 opacity-[0.10]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
      </svg>
      <svg
        className="absolute left-[28%] bottom-[18%] hidden h-4 w-4 text-sand-500 opacity-[0.12] sm:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
      </svg>
      <svg
        className="absolute right-[8%] top-[20%] hidden h-2.5 w-2.5 text-sand-600 opacity-[0.14] md:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
      </svg>
    </div>
  )
}
