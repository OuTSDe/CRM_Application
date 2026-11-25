# Accord · 25 Nov 2026 · Preferential location charges (PLC) on corner residences

Asked by Sanath (admin).

## What changed
- **Corner PLC added automatically.** A cost sheet for a corner residence gets a lump-sum PLC line, "Preferential location charges (PLC), corner residence". It's ₹2,00,000 plus GST at the rate-card rate, in the agreement value. To start with, the corners are F1 and F8 on the 3rd–32nd floors, for example 301 and 308, so 60 residences.
- **Manual PLC on any cost sheet.** A new field, *Preferential location charges (₹)*, is in *2 · Rate*. Leave it empty to use the corner PLC, or type an amount to add a PLC to any residence. Anyone can add or raise a PLC. Only admins and senior sales can lower or remove a corner PLC. The saved cost sheet keeps the typed amount (`plcAmount`) and the PLC charged (`plcTotal`).
- **Admin → Settings → Rate card → Preferential location charges (corner residences).** Set the lump sum, and tick the corner positions for each band: Podium & Typical, Sub-Sky Deck, Sky Deck, Sky Residences, Duplexes, Panorama, Signature, Crown. Upper floors are not ticked yet. Press *Save settings*.

## Files
- `source/src/lib/calc.js`: `DEFAULT_CORNER_PLC`, `cornerPlcOf`, `isCorner`, `cornerPlcFor`; `costSheet({ plcAmount })`. The old per-sft `plc` still works.
- `source/src/seed/ops.js`: `rateCard.cornerPlc` default.
- `source/src/modules/crm/CostSheet.jsx`: the PLC field and its limits.
- `source/src/modules/admin/Admin.jsx`: the corner picker in Settings.
- `site/index.html`: rebuilt.

No backend change. The rate card is saved in Settings as before.
