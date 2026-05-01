# OTM Color Palette — Sampled from Brand Assets

These hex values were sampled directly from the proprietary `growth-lifecycle.avif` asset. Use them as the source of truth for any new components in this round. **Verify against `src/app/globals.css`** — if matching CSS variables already exist, use those. If a variable doesn't exist, add it using these hex values.

## Brand colors

| Use | Hex | Approx CSS var name |
|-----|-----|---------------------|
| Primary navy (titles, headings, dark text) | `#0d354f` | `--otm-navy` / `text-otm-navy` |
| Deep teal (accent, button hover) | `#146a7b` | `--otm-deep-teal` |
| Mid teal (current bottom-bar segments 3 & 4) | `#2d9198` | `--otm-teal` |
| Bright teal (icons, accents) | `#1a7b74` | `--otm-teal-bright` |
| Gold (highlight, "you are here", segment 5) | `#e7a923` | `--otm-gold` |
| Deep gold (segment 6, hover state on gold) | `#d7ae46` | `--otm-gold-deep` |

## Background tints

| Use | Hex |
|-----|-----|
| Page background | `#f7f7f7` |
| Light teal fill (S-curve lower-left wash) | `#e0f5f6` |
| Light cream/gold fill (S-curve upper-right wash) | `#faf2de` |

## Text colors

| Use | Hex |
|-----|-----|
| Primary text | `#0d354f` (navy) |
| Body / description | `#5b6577` (slate) |
| Muted / captions | `#8a92a3` |
| White text (on dark bottom bar) | `#ffffff` |

## Status palette (for top progression strip)

These are derived from the brand palette plus standard amber/red for warning states.

| Status | Border / accent | Background tint | Number badge | Badge text |
|--------|-----------------|-----------------|--------------|------------|
| LOCKED | `#cbd2db` (cool grey) | `#f5f6f8` | `#cbd2db` bg, `#5b6577` fg | `#5b6577` on `#e7eaf0` |
| IN PROGRESS | `#e7a923` (gold) | `#fff8e8` | `#e7a923` bg, `#ffffff` fg | `#ffffff` on `#e7a923` |
| AWAITING APPROVAL | `#2d9198` (teal) | `#e0f5f6` | `#2d9198` bg, `#ffffff` fg | `#ffffff` on `#2d9198` |
| LOCKED IN | `#0d354f` (navy) | `#e8edf2` | `#0d354f` bg, `#ffffff` fg | `#ffffff` on `#0d354f` |
| NEEDS REVIEW | `#c84a3c` (warning red) | `#fceeec` | `#c84a3c` bg, `#ffffff` fg | `#ffffff` on `#c84a3c` |
| PENDING UPDATE | `#b88a2e` (muted gold) | `#fbf2e0` | `#b88a2e` bg, `#ffffff` fg | `#ffffff` on `#b88a2e` |

## Bottom-bar progression colors (lifecycle visual)

Reading left-to-right, the 6 segments use these colors (sampled from the source):

| Segment | Stage | Hex |
|---------|-------|-----|
| 1 | FORMATION | `#0d354f` (navy) |
| 2 | TRACTION | `#146a7b` (deep teal) |
| 3 | STRUCTURE | `#2d9198` (mid teal) |
| 4 | MOMENTUM | `#36868b` (mid teal, slight shift) |
| 5 | SCALE-READY | `#e7a923` (gold) |
| 6 | ACCELERATE + EXIT | `#d7ae46` (deep gold) |
