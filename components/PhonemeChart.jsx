"use client";

import { CONSONANTS, VOWELS } from "@/lib/phonemes";

export function PhonemeChart({ onPick, showHints = true, groups = ["consonants", "vowels"] }) {
  const sections = [];
  if (groups.includes("consonants")) sections.push({ title: "Consonants", items: CONSONANTS });
  if (groups.includes("vowels")) sections.push({ title: "Vowels", items: VOWELS });

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="label mb-2">{section.title}</p>
          <div className="flex flex-wrap gap-2">
            {section.items.map((p) => (
              <button
                key={p.ipa}
                type="button"
                className="chip"
                title={showHints ? `${p.label} (as in ${p.example})` : undefined}
                onClick={() => onPick?.(p.ipa)}
              >
                /{p.ipa}/
                {showHints && (
                  <span
                    className="block text-[0.6rem] font-sans font-normal mt-0.5"
                    style={{ color: "var(--color-ink-soft)" }}
                  >
                    {p.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
