# Accord · e-Brochure in the Yamuna Sky City identity (22 November 2026)

The e-brochure (`/brochure`) is rebuilt on the INSDe brand guidelines for Yamuna Sky City (2026 V1.1) and filled with the material the sales team presents today.

## Brand
- Colours: Skycity Ember `#B42810`, Pearl Ivory `#F7F0E6`, Black, Mist Grey `#C6C7C8`, with the guidelines' tonal scales. The e-brochure keeps this palette whatever the app theme is.
- Type: Atkinson Hyperlegible Next for headings and text, DM Serif Display italic for accent words, Archivo (condensed width) for figures. Loaded from Google Fonts in `source/index.html`.
- Logo: the horizontal lockup, vertical lockup and brand mark, traced from the guidelines into `source/src/modules/presales/brand/*.svg` (single colour, `currentColor`). Used white on dark, at or above the 120 px digital minimum.
- Section headers follow the guidelines' page header: two hairlines, section number in ember, "Yamuna Sky City" on the right.

## Layout
- One 12-column grid (same outer margin and gutter everywhere), so every text block, tile and plan lines up.
- Full-bleed renders with vignettes on the side the text sits (left, right, bottom, hero, ember close).
- Tiles are pre-cropped to exact ratios (4:5, 3:2, 4:3, 16:10) so rows align.
- Unit plans sit directly on Pearl Ivory: the drawings' own ground was swapped for ivory and their title blocks painted out (the caption carries the residence, floors and area).

## Sections (first visit and general)
Film → The address → The cultural coast → Engineering → Design → Residences → Interiors → **Clubhouse** → **The grounds** → **Sky terrace** → Structure and progress → House team → Availability (live) → Thank you.
- New sections: Clubhouse (third-floor podium, 46,000 sq ft clubhouse, pools, six amenity tiles, podium plan), The grounds (Miyawaki forest, three tiles, four groups of the 36 ground-floor features), Sky terrace (infinity pool, rooftop café, sunset deck, terrace plan). They are editable slides in *Edit content* and can be switched per visit.
- Visit lists saved before today get the three new sections after Interiors automatically; once the visit table is edited (`visitsV: 2`) the saved lists are used as they are.
- Interests now also bring in the amenity sections on return visits (Wellness, Family → Clubhouse and Grounds; Sea and views, Luxury → Sky terrace).
- Address: six figures (3.6 acres, residences, 60 levels, 250 m from the beach, 8 lifts, 2028) and distances (Chithrapura Beach 0.3 km … airport 12 km), from the sales brochures.
- Engineering: piling, night pour and CPP wind-tunnel photographs, and the consultant team from the sales brochure.
- Residences: an interior render per type, full bleed, and the unit's 2D + 3D plan (2 BHK F2 1,599 sq ft; 3 BHK F1 2,473 sq ft; 4 BHK F1 floors 35–42 5,608 sq ft; 5 BHK duplex F1 floors 43–44 10,713 sq ft). Areas, floors and availability still come live from the inventory.
- Film: `Intro Video.mp4` encoded for the web (1600 px, 60 s, 19.7 MB) plays muted on a loop, with **Sound on**. A film link set in the editor still takes precedence.
- Footer carries the RERA number (`PRM/KA/RERA/1257/334/PR/171023/006331` unless Settings has one) and "Renders are artistic impressions".

## Images
`site/brochure/` holds 37 curated images and the film (about 29 MB). Sources, from `Accord e-brochure/Incoming`:
- Design Team/Renders: Building Elevations, Landscape, 3rd Floor Podium, Clubhouse Amenities, Interiors, Lobby, Terrace Floor, Floor Plans (ISO sheets).
- Sales Team TV/Presentation: 8. Pilling, Work Done, Wind Test (video frame), the WhatsApp site photographs.
- Text and figures: YSC_Brochure 02.pdf (latest), YSC_Brochure_New.pdf, the brand guidelines.

A photograph or the film link set in *Edit content* still replaces the bundled one for that section.

## Still open
- The figures quoted from the sales brochure (46,000 sq ft clubhouse, 8 lifts, distances, 2028) should be confirmed by marketing; the two brochures differ slightly (45,000 vs 46,000 sq ft).
- Fonts load from Google Fonts; offline (file://) the brochure falls back to the system sans.
