# Parking data from the DWG

Rebuilds `source/src/lib/parkingData.js` when the architect sends a new parking drawing.

1. `npm i @mlightcad/libredwg-web` in this folder, then `node read.mjs "<drawing>.dwg"` → `db.json`.
2. `python3 render.py` splits the entities into sheets by title block (edit `TB` if the sheets move).
3. Pair the slot circles with their numbers (layer `car no`), see `inv.py`, which also holds the label corrections.
   `python3 pair.py`, then `python3 inv.py`.
4. `python3 bg.py` writes the plan linework, `python3 emit.py` writes `parkingData.js`. Copy it to `source/src/lib/`.

Check the counts on Rules and drawings against the parking statement on the drawing before loading new slots.
