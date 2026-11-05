// Operations seed: settings, rate card, sourcing trip (22-25 Oct), vendors, sample flat project and BOQ, e-brochure content.
// Sources: Yamuna Sky City Cost Sheet Master Template (rate card), Payment Receipt Template (company details),
// "Sample Flat Sourcing Trip, 22 to 25 Oct" (stops, vendors, BOQ quantities and budget rates), meetings of 10-10-2026 and 29-10-2026.

export const SETTINGS = {
  id: 'main',
  company: {
    name: 'YAMUNA HOMES AND DESIGN PVT LTD',
    project: 'YAMUNA SKY CITY',
    location: 'Kulai, Mangalore',
    address: 'Yamuna Asha City, Kulai, Mangalore, Karnataka',
    gstin: '29AAACY7873L1ZG',
    rera: 'PRM/KA/RERA/1257/334/PR/171023/006331',
    bank: 'State Bank of India', account: '42408044068', ifsc: 'SBIN0004118', branch: 'CB Mangalore',
    contact: '8884439155',
    tagline: "South India's highest address",
  },
  rateCard: {
    baseRate: 10000,
    discountSteps: [0, 2.5, 5, 7.5, 10],        // % off base; sales can pick, steps above approvalAbove need admin approval
    approvalAbove: 5,
    floorRiseStart: 5,                            // floors at or below this pay no floor rise (29-10 meeting: "floor rise starting is 5th floor")
    floorRisePerFloor: 100,                       // ₹ per sft per floor above start
    plc: 0, terraceRate: 5000, parkingRate: 400000,
    parkingSlots: { '2 BHK': 1, '3 BHK': 1, '4 BHK': 1, '5 BHK': 1 },
    gst: 0.05,
    mwssb: 140, clubhouse: 500000, maintenance: 60, sinking: 60,
    minBooking: 1200000, validityDays: 15, blockingDays: 30,
  },
  plans: {
    Self: [
      { stage: 'On booking', pct: 0.05 }, { stage: 'On agreement', pct: 0.40 },
      { stage: 'On completion of 30th floor', pct: 0.12 }, { stage: 'On completion of 60th floor', pct: 0.25 }, { stage: 'On handover', pct: 0.18 }],
    'Bank loan': [
      { stage: 'On booking', pct: 0.05 }, { stage: 'On agreement (minimum before loan)', pct: 0.25 },
      { stage: 'On completion of 30th floor (loan disbursement)', pct: 0.20 }, { stage: 'On completion of 60th floor (loan disbursement)', pct: 0.30 }, { stage: 'On handover', pct: 0.20 }],
  },
  terms: [
    "All payments to be made in favour of 'YAMUNA HOMES AND DESIGN PVT LTD'.",
    'Booking amount of minimum ₹12 Lakhs blocks the unit for 30 days.',
    'Stamp duty and registration charges are additional and payable at actuals.',
    'Legal and documentation charges are additional.',
    'Advance maintenance, MWSSB, MESCOM and sinking fund are additional to the agreement value.',
    'This cost sheet is valid for 15 days from the date quoted.',
    'Areas stated are indicative saleable areas and are subject to final measurement.',
    'All figures are in Indian Rupees and are exclusive of any future statutory revisions.',
  ],
  receiptNotes: [
    'Received with thanks by YAMUNA HOMES AND DESIGN PVT LTD towards the unit stated above.',
    'Issued subject to realisation of the instrument. A receipt against a dishonoured instrument stands cancelled.',
    'Acknowledges payment only; it does not by itself confer title, possession or any right in the unit.',
    'Stamp duty, registration and statutory charges are additional unless expressly stated above.',
    'Please quote the receipt number and unit number in all future correspondence.',
  ],
  gstDemand: 0.05, dueDays: 15, rera: 0.10, contactRed: 30,
  workday: { start: '09:30', end: '18:30' },
  vocabulary: [
    ['flat / unit', 'residence, sky villa'], ['site visit', 'private viewing'], ['booking / token', 'reservation'],
    ['offer / discount', 'founding privilege'], ['sales executive', 'client advisor']],
  backendUrl: '',
  driveRootFolder: 'Accord',
}

export const EXTRA_USERS = [
  { id: 'T-07', name: 'Shruthadev', team: 'Management', role: 'Research Director, OuTSDe', designation: 'Research Director', appRole: 'admin', active: 'Yes' },
  { id: 'T-08', name: 'Kajal', team: 'Design', role: 'Creative Director, [INSD]e*', designation: 'Creative Director', appRole: 'design', active: 'Yes' },
]
// 30 Oct: Anuradha and Medha are purely sales (no money). Cyril has higher access. Khushi assigns tasks with the admins.
export const ROLE_OF = { Aryan: 'admin', Shruthadev: 'admin', Anuradha: 'sales', Medha: 'sales', Cyril: 'senior', Khushi: 'senior', Yakshith: 'sales', Kajal: 'design', 'Smitha (SBI)': 'bank' }
// Chain of command for escalations: a follow-up left open goes to the person's manager, then theirs.
export const REPORTS_TO = { Anuradha: 'Cyril', Medha: 'Cyril', Yakshith: 'Cyril', Khushi: 'Aryan', Cyril: 'Aryan', Kajal: 'Shruthadev' }
export const DESIGNATION_OF = { Aryan: 'Director', Anuradha: 'Client Relations', Medha: 'Client Relations', Cyril: 'Senior Sales Manager', Khushi: 'Sales and CRM', Yakshith: 'Client Relations' }

// ---------------- Vendors from the sourcing trip plan
const V = (id, name, category, city, area, address, phone, brands, packages, extra = {}) => ({
  id, name, category, city, area, address, phone, brands, packages, status: 'Shortlisted', source: 'Sourcing trip 22-25 Oct', ...extra })
export const VENDORS = [
  V('V-001', 'Häfele Design Centre', 'Hardware', 'Bengaluru', 'Shanthi Nagar', 'No. 2/1 Shiv Manor, Langford Road, Shanthi Nagar 560027', '', 'Häfele', 'Kitchen and wardrobe hardware', { appointment: 'Architect walk-through' }),
  V('V-002', 'Grohe Experience Centre', 'Sanitary & CP', 'Bengaluru', 'Lavelle Road', 'Lavelle Road (confirm building number)', '', 'Grohe', 'CP fittings, shower systems'),
  V('V-003', 'Nexion Design Lab', 'Tiles', 'Bengaluru', 'Jayanagar', '1873, 2nd floor, 38th A Cross, Jayanagar 560041', '+91 80 4207 3185', 'Nexion', 'Bath tile, mosaic, service tiles', { appointment: 'By appointment' }),
  V('V-004', 'Marble Centre International', 'Stone', 'Bengaluru', 'Jigani', '327A Bommasandra-Jigani Link Road, KIADB, Jigani 560105', '+91 80 6900 3737', 'MCI (600+ stones, 42 countries)', 'Travertine, grey veined, black marble, green counter, white marble check'),
  V('V-005', 'Lutron at Anusha Technovision', 'Lighting control', 'Mumbai', 'Worli', 'Worli, behind the Four Seasons hotel', '+91 22 4967 5653', 'Lutron', 'Dimming scenes', { appointment: 'Full scene demo' }),
  V('V-006', 'Blum Experience Centre (Platinum Modular Solutions)', 'Hardware', 'Mumbai', 'Lower Parel', '1st floor, Raghuvansh Mill, Gandhi Nagar, Lower Parel', '', 'Blum', 'Lift-ups, hinges, drawers'),
  V('V-007', 'Lohar Chawl lighting market', 'Lighting', 'Mumbai', 'Kalbadevi', 'Kalbadevi, near Crawford Market', '', 'Wholesale market', 'LED strip, profiles, drivers, downlights', { notes: 'Market, not a brand centre. Photos, model numbers, warranty bills.' }),
  V('V-008', 'Hettich Experience Centre', 'Hardware', 'Mumbai', 'Andheri West', 'Durolite House, Veera Desai Industrial Estate, Andheri West 400053', '+91 84540 55055', 'Hettich', 'Sliding and pull-out systems', { appointment: 'Book now link' }),
  V('V-009', "D'Decor flagship", 'Fabrics & wallcoverings', 'Mumbai', 'Andheri West', 'Veera Desai Road, Andheri West', '', "D'Decor, FabriCare, SIMONE", 'Fabric panels, curtains, tapestry wallpaper, faux leather'),
  V('V-010', 'Greenlam LA Opulence (Luxur Interior)', 'Veneers & doors', 'Mumbai', 'Andheri West', 'Laxmi Industrial Estate, Andheri West', '', 'Greenlam Decowood, Mikasa doors', 'Walnut, cigar room, wine wall, burl, theatre flutes, doors'),
  V('V-011', 'DN Nagar lighting shops', 'Lighting', 'Mumbai', 'Andheri West', 'Andheri Link Road, opposite DN Nagar police station', '', 'Lightique Concept, Glowain, Nagrik Lights', 'Pendants, sconces, domes, dining cluster, chandelier'),
  V('V-012', 'Jaquar World', 'Sanitary & CP', 'Mumbai', 'Santacruz West', '101-103 Kamla Spaces, S.V. Road, Santacruz West 400054', '91671 53996', 'Jaquar', 'WCs, basins, shower glass, decorative lighting', { appointment: 'By appointment' }),
  V('V-013', 'Kohler Experience Centre', 'Sanitary & CP', 'Delhi', 'Lajpat Nagar', '26A Lajpat Nagar 4, New Delhi 110024', '011 4953 1800', 'Kohler', 'Freestanding tubs, wall-hung WCs, basins'),
  V('V-014', 'White Teak', 'Lighting', 'Delhi', 'Lajpat Nagar / MG Road', '13 Ring Road, Lajpat Nagar IV, New Delhi 110024', '1800 121 2931', 'White Teak', 'Chandelier, pendants, sconces, statement lights'),
  V('V-015', 'R K Marble', 'Stone', 'Gurugram', 'Gurugram', 'Gurugram warehouse (also Kishangarh)', '', 'R K Marble', 'Second stone quote, Indian white marble'),
]

// ---------------- Sourcing trip (Day Tracker format: stops with planned times, live progress)
const S = (id, day, time, end, name, vendorId, address, contact, shortlist, extra = {}) => ({ id, tripId: 'TR-001', day, time, end, name, vendorId, address, contact, shortlist, status: 'Planned', ...extra })
export const TRIPS = [{
  id: 'TR-001', name: 'Sample Flat Sourcing Trip', from: '2026-10-22', to: '2026-10-25', team: 'Shruthadev, Kajal, Aryan',
  purpose: 'Shortlist, samples and written quotes for every package in the sample flat BOQ',
  roles: 'Kajal makes the design call on every finish, Aryan leads the commercial discussion, Shruthadev logs each quote and sample against its BOQ line.',
  projectId: 'PR-001',
  days: [
    { date: '2026-10-22', city: 'Bengaluru', area: 'Shanthi Nagar and Lavelle Road, then Jayanagar and Jigani', flight: 'IXE 08:40 to BLR (6E306); BLR ~22:00 to BOM', night: 'Mumbai, Lower Parel or Worli' },
    { date: '2026-10-23', city: 'Mumbai', area: 'Worli, Lower Parel, Kalbadevi', flight: 'None', night: 'Same hotel' },
    { date: '2026-10-24', city: 'Mumbai', area: 'Andheri West and Santacruz', flight: 'BOM 20:30 or 21:00 to DEL (6E330 or AI816)', night: 'South Delhi, near Lajpat Nagar' },
    { date: '2026-10-25', city: 'Delhi', area: 'Lajpat Nagar, then Mehrauli-Gurgaon Road', flight: 'DEL 19:20 to IXE (IX1492)', night: 'Home' }],
  checklist: [
    ['Flights: IXE-BLR Thu 08:40; BLR-BOM Thu ~22:00; BOM-DEL Sat ~20:30; DEL-IXE Sun 19:20', false],
    ['Hotels: Mumbai Thu and Fri (Lower Parel or Worli); Delhi Sat (near Lajpat Nagar)', false],
    ['Cabs: one car with driver for each full day', false],
    ['Häfele Bengaluru: architect walk-through, Thu 11:00', false],
    ['Grohe Bengaluru: book Thu 12:30, get Lavelle Road building number', false],
    ['Nexion Jayanagar: +91 80 4207 3185, Thu 14:45', false],
    ['MCI Jigani: +91 80 6900 3737, Thu 16:00; pull travertine, grey veined and black slabs', false],
    ['Lutron at Anusha, Worli: +91 22 4967 5653, Fri 10:30; full scene demo', false],
    ['Blum Lower Parel: Fri 12:30', false],
    ['Hettich Andheri: +91 84540 55055, Sat 10:30', false],
    ['Jaquar World Santacruz: 91671 53996, Sat 16:45', false],
    ['Call Jaquar Defence Colony and R K Marble: open Sunday 25 Oct?', false],
    ['Email each vendor the BOQ quantities so quotes are ready on the day', false]].map(([t, d], i) => ({ id: 'C' + (i + 1), text: t, done: d })),
  risks: [
    'Indian marble at source (Kishangarh) is not on this route; plan a separate day if MCI and R K Marble run above ₹120-350/sft for Makrana.',
    'Sunday in Delhi depends on calls: only Kohler and White Teak are confirmed open.',
    'Nilaya (Asian Paints) wallcoverings: no showroom on the route; ask the Mangaluru dealer for the books.',
    'Lutron has no BOQ line; its quote is new cost on top of the ₹15.2 L lighting package.',
    'Lohar Chawl and DN Nagar are markets: take model numbers, buy one sample, keep warranty bills.',
    'Kohler, Grohe and Jaquar: quote the same five items for a like-for-like comparison.'],
}]
export const STOPS = [
  S('ST-01', '2026-10-22', '06:45', '08:40', 'Start: leave for Mangaluru airport', null, 'Bajpe', '', 'IndiGo 6E306 at 08:40', { start: true }),
  S('ST-02', '2026-10-22', '11:00', '12:15', 'Häfele Design Centre', 'V-001', 'Langford Road, Shanthi Nagar', '', 'Kitchen fittings (23.8 rft), wardrobe fronts (233 sqft), dresser (79 sqft)', { packages: ['PK-08'] }),
  S('ST-03', '2026-10-22', '12:30', '13:30', 'Grohe Experience Centre', 'V-002', 'Lavelle Road', '', 'Brass CP sets for 5 baths, kitchen mixer, showers', { packages: ['PK-09'] }),
  S('ST-04', '2026-10-22', '13:30', '14:30', 'Lunch', null, 'Lavelle Road or Church Street', '', ''),
  S('ST-05', '2026-10-22', '14:45', '15:45', 'Nexion Design Lab', 'V-003', 'Jayanagar', '+91 80 4207 3185', 'Blue bath tile 263, mosaic 37, service 110 + 142 sqft', { packages: ['PK-07'] }),
  S('ST-06', '2026-10-22', '16:00', '18:00', 'Marble Centre International', 'V-004', 'Jigani', '+91 80 6900 3737', 'Travertine 477, grey veined 140, black 260, green 93; price white marble 2,324 sqft', { packages: ['PK-01', 'PK-02', 'PK-03', 'PK-04', 'PK-05', 'PK-06'] }),
  S('ST-07', '2026-10-22', '21:45', '23:30', 'Fly to Mumbai', null, 'Kempegowda Airport', '', 'AI2642, 6E5094 or QP1134'),
  S('ST-08', '2026-10-23', '10:30', '12:15', 'Lutron at Anusha Technovision', 'V-005', 'Worli', '+91 22 4967 5653', 'Dimming scenes: living, theatre, bedrooms; 80 downlights, 450 rft cove', { packages: ['PK-16'] }),
  S('ST-09', '2026-10-23', '12:30', '13:30', 'Blum Experience Centre', 'V-006', 'Lower Parel', '', 'Lift-ups, hinges, drawers: second hardware quote', { packages: ['PK-08'] }),
  S('ST-10', '2026-10-23', '13:45', '14:45', 'Lunch', null, 'Lower Parel', '', ''),
  S('ST-11', '2026-10-23', '15:00', '18:00', 'Lohar Chawl lighting market', 'V-007', 'Kalbadevi', '', 'LED strip and profiles (450 + 82 rft), drivers, 80 downlight samples', { packages: ['PK-14'] }),
  S('ST-12', '2026-10-24', '10:30', '11:30', 'Hettich Experience Centre', 'V-008', 'Andheri West', '+91 84540 55055', 'Third hardware quote; walk-in wardrobe sliding systems', { packages: ['PK-08'] }),
  S('ST-13', '2026-10-24', '11:45', '12:45', "D'Decor flagship", 'V-009', 'Andheri West', '', 'Fabric panels 423, curtains 615, tapestry 141; faux leather 113 sqft', { packages: ['PK-12', 'PK-13'] }),
  S('ST-14', '2026-10-24', '13:00', '14:00', 'Lunch', null, 'Andheri West', '', ''),
  S('ST-15', '2026-10-24', '14:00', '15:15', 'Greenlam LA Opulence', 'V-010', 'Andheri West', '', 'Veneers 1,035 sqft; Mikasa doors 10 + 1', { packages: ['PK-10', 'PK-11'] }),
  S('ST-16', '2026-10-24', '15:30', '16:30', 'DN Nagar lighting shops', 'V-011', 'Andheri Link Road', '', 'Pendants 8, sconces 12, domes 2, dining cluster, chandelier', { packages: ['PK-15'] }),
  S('ST-17', '2026-10-24', '16:45', '18:00', 'Jaquar World', 'V-012', 'Santacruz West', '91671 53996', 'Second CP and sanitary quote', { packages: ['PK-09'] }),
  S('ST-18', '2026-10-25', '11:00', '12:15', 'Kohler Experience Centre', 'V-013', 'Lajpat Nagar 4', '011 4953 1800', 'Tubs 2, wall-hung WCs 5, basins 6: final sanitary comparison', { packages: ['PK-09'] }),
  S('ST-19', '2026-10-25', '12:30', '13:15', 'White Teak, Ring Road', 'V-014', 'Lajpat Nagar IV', '1800 121 2931', 'Chandelier, pendants, sconces vs DN Nagar prices', { packages: ['PK-15'] }),
  S('ST-20', '2026-10-25', '13:15', '13:45', 'Jaquar Orientation Centre (call first)', 'V-012', 'D-56 Defence Colony', '011 4021 9650', 'Only if Saturday left questions', { maybe: true }),
  S('ST-21', '2026-10-25', '15:00', '16:30', 'MG Road design stretch (White Teak MG Road)', 'V-014', 'A-225 New Manglapuri', '', 'Statement lighting; loose furniture allowance', { packages: ['PK-15', 'PK-17'] }),
  S('ST-22', '2026-10-25', '16:30', '17:30', 'R K Marble, Gurugram (call first)', 'V-015', 'Gurugram', '', 'Second stone quote, Indian white marble', { maybe: true, packages: ['PK-01'] }),
  S('ST-23', '2026-10-25', '19:20', '21:30', 'Fly home', null, 'Delhi airport', '', 'IX1492 to Mangaluru'),
]
export const SIX_QUESTIONS = ['Rate per sqft / rft / piece, GST shown separately', 'Lead time to site in Mangaluru (land by mid-November)',
  'Freight and packing to Mangaluru', 'Samples to carry back, or courier date', 'Quote validity and minimum order', 'Installer or service partner in Mangaluru or Bengaluru']

// ---------------- Main Accord project: sample flat, rooms and BOQ (quantities and budget rates from the trip plan)
export const PROJECTS = [{ id: 'PR-001', name: 'Sample Flat · Yamuna Sky City', client: 'Yamuna Homes and Design', location: 'Kulai, Mangaluru',
  unit: '15th floor sample residence', wallHeight: '9 ft', due: '2026-12-15', status: 'Sourcing', designer: 'Kajal',
  notes: 'Flat must be ready for the mid-December launch; materials should land by mid-November.' }]
const R = (id, name, finishes) => ({ id, projectId: 'PR-001', name, renders: [], finishes, notes: '' })
export const ROOMS = [
  R('RM-01', 'Foyer', [{ surface: 'Wall panelling', material: 'Walnut veneer (Decowood)', boq: 'BQ-17' }, { surface: 'Floor', material: 'White marble, honed', boq: 'BQ-01' }]),
  R('RM-02', 'Living room', [{ surface: 'Floor', material: 'White marble', boq: 'BQ-01' }, { surface: 'Fireplace wall', material: 'Grey veined stone', boq: 'BQ-05' }, { surface: 'Curved panels', material: "Fabric panels (D'Decor)", boq: 'BQ-22' }, { surface: 'Lighting', material: 'Cove + downlights, scenes', boq: 'BQ-27' }]),
  R('RM-03', 'Dining', [{ surface: 'Feature light', material: 'Dining cluster', boq: 'BQ-30' }, { surface: 'Floor', material: 'Travertine', boq: 'BQ-03' }]),
  R('RM-04', 'Kitchen', [{ surface: 'Counter and splash', material: 'Green marble', boq: 'BQ-06' }, { surface: 'Island', material: 'Travertine bands', boq: 'BQ-04' }, { surface: 'Column', material: 'Mosaic', boq: 'BQ-09' }, { surface: 'Hardware', material: 'Häfele / Blum / Hettich (compare)', boq: 'BQ-12' }]),
  R('RM-05', 'Master bedroom', [{ surface: 'Headboard', material: 'Burl veneer', boq: 'BQ-20' }, { surface: 'Wardrobe', material: 'Joinery fronts', boq: 'BQ-13' }]),
  R('RM-06', 'Bedroom four', [{ surface: 'Headboard', material: 'Faux leather', boq: 'BQ-24' }]),
  R('RM-07', 'Home theatre', [{ surface: 'Wall', material: 'Theatre flutes (veneer)', boq: 'BQ-21' }]),
  R('RM-08', 'Cigar room and wine wall', [{ surface: 'Panelling and vault', material: 'Stained veneer', boq: 'BQ-18' }, { surface: 'Wine wall', material: 'Veneer', boq: 'BQ-19' }]),
  R('RM-09', 'Bathrooms (5)', [{ surface: 'Walls', material: 'Travertine', boq: 'BQ-03' }, { surface: 'Tiles', material: 'Blue bath tile', boq: 'BQ-08' }, { surface: 'Sanitary and CP', material: 'Grohe / Jaquar / Kohler (compare)', boq: 'BQ-15' }]),
  R('RM-10', 'Balconies', [{ surface: 'Floor', material: 'Granite', boq: 'BQ-07' }]),
]
const P = (id, name, optional = false) => ({ id, projectId: 'PR-001', name, optional, on: !optional })
export const PACKAGES = [P('PK-01', 'White marble'), P('PK-02', 'Black marble'), P('PK-03', 'Travertine'), P('PK-04', 'Grey veined stone'), P('PK-05', 'Green marble'),
  P('PK-06', 'Balcony granite'), P('PK-07', 'Tiles'), P('PK-08', 'Hardware and joinery'), P('PK-09', 'Sanitary and CP'), P('PK-10', 'Veneers'), P('PK-11', 'Doors'),
  P('PK-12', 'Fabric and wall panels'), P('PK-13', 'Curtains and sheers'), P('PK-14', 'Lighting: downlights and cove'), P('PK-15', 'Decorative lighting'),
  P('PK-16', 'Lighting control', true), P('PK-17', 'Furniture and styling allowance', true)]
const B = (id, pk, item, qty, unit, rate, room = '') => ({ id, projectId: 'PR-001', packageId: pk, item, qty, unit, rate, room, selectedQuote: null })
export const BOQ = [
  B('BQ-01', 'PK-01', 'White marble: floor, honed wet floors, washroom capsule', 2324, 'sqft', 450, 'Whole flat'),
  B('BQ-02', 'PK-02', 'Black marble', 260, 'sqft', 320),
  B('BQ-03', 'PK-03', 'Travertine: floor 175 + bath walls 255', 430, 'sqft', 500, 'Dining, baths'),
  B('BQ-04', 'PK-03', 'Travertine island bands', 47, 'sqft', 1400, 'Kitchen'),
  B('BQ-05', 'PK-04', 'Grey veined fireplace wall', 140, 'sqft', 900, 'Living'),
  B('BQ-06', 'PK-05', 'Green marble counter and splash', 93, 'sqft', 600, 'Kitchen'),
  B('BQ-07', 'PK-06', 'Balcony granite', 763, 'sqft', 230, 'Balconies'),
  B('BQ-08', 'PK-07', 'Blue bath tile', 263, 'sqft', 450, 'Baths'),
  B('BQ-09', 'PK-07', 'Mosaic for kitchen column', 37, 'sqft', 650, 'Kitchen'),
  B('BQ-10', 'PK-07', 'Service floor tile', 110, 'sqft', 110, 'Service'),
  B('BQ-11', 'PK-07', 'Service dado tile', 142, 'sqft', 130, 'Service'),
  B('BQ-12', 'PK-08', 'Kitchen units with hardware', 23.8, 'rft', 9500, 'Kitchen'),
  B('BQ-13', 'PK-08', 'Wardrobe and walk-in fronts', 233, 'sqft', 1500, 'Bedrooms'),
  B('BQ-14', 'PK-08', 'Dresser 79 + study 49', 128, 'sqft', 1200, 'Bedrooms'),
  B('BQ-15', 'PK-09', 'Wall-hung WCs', 5, 'nos', 55000, 'Baths'),
  B('BQ-16', 'PK-09', 'Freestanding tubs', 2, 'nos', 140000, 'Baths'),
  B('BQ-31', 'PK-09', 'CP sets (brass finish)', 5, 'sets', 60000, 'Baths'),
  B('BQ-32', 'PK-09', 'Brass basins', 3, 'nos', 45000, 'Baths'),
  B('BQ-33', 'PK-09', 'Shower glass', 2, 'nos', 22000, 'Baths'),
  B('BQ-17', 'PK-10', 'Walnut veneer: foyer', 246, 'sqft', 1050, 'Foyer'),
  B('BQ-18', 'PK-10', 'Stained panelling and vault: cigar room', 316, 'sqft', 1900, 'Cigar room'),
  B('BQ-19', 'PK-10', 'Wine wall veneer', 99, 'sqft', 1500, 'Cigar room'),
  B('BQ-20', 'PK-10', 'Burl headboard', 39, 'sqft', 1900, 'Master bedroom'),
  B('BQ-21', 'PK-10', 'Theatre flutes', 335, 'sqft', 1200, 'Theatre'),
  B('BQ-34', 'PK-11', 'Internal doors (Mikasa)', 10, 'nos', 38000),
  B('BQ-35', 'PK-11', 'Main door', 1, 'nos', 110000, 'Foyer'),
  B('BQ-22', 'PK-12', 'Fabric curved panels', 423, 'sqft', 950, 'Living'),
  B('BQ-23', 'PK-12', 'Powder room panels 305, tapestry 141, mural 210', 656, 'sqft', 450),
  B('BQ-24', 'PK-12', 'Faux leather headboard', 113, 'sqft', 600, 'Bedroom four'),
  B('BQ-25', 'PK-13', 'Curtains and sheers', 615, 'sqft', 450),
  B('BQ-26', 'PK-14', 'Downlights', 80, 'nos', 1800),
  B('BQ-27', 'PK-14', 'Cove LED', 450, 'rft', 350),
  B('BQ-28', 'PK-14', 'Shelf LED', 82, 'rft', 450),
  B('BQ-29', 'PK-15', 'Pendants 8, sconces 12, domes 2', 22, 'nos', 18000),
  B('BQ-30', 'PK-15', 'Chandelier and dining cluster', 2, 'nos', 150000, 'Dining'),
  B('BQ-36', 'PK-16', 'Lutron scene package (living, theatre, master)', 1, 'lot', 0),
  B('BQ-37', 'PK-17', 'Furniture and styling allowance', 1, 'lot', 2470000),
]

// ---------------- e-Brochure (button-driven, no scrolling; content editable on the Brochure editor)
export const BROCHURE = {
  id: 'main',
  updatedOn: '2026-10-28', progressEveryDays: 14,
  slides: [
    { id: 'welcome', kind: 'welcome', title: 'Welcome to Yamuna Sky City', body: 'A private viewing, prepared for you.', image: '' },
    { id: 'address', kind: 'text', title: 'An address above the coast', body: 'Mangaluru city has no sea-facing land left to build on. Sky City rises where the coastline opens up, so every residence is planned around the view.', image: '' },
    { id: 'structure', kind: 'facts', title: 'Built to stand tall by the sea', facts: [
      ['M75 concrete', 'A typical home uses M25 to M30; most skyscrapers use M50. Sky City uses M75.'],
      ['Temperature-controlled pours', 'Foundation concrete is poured with ice to hold 25 to 27 °C, so it cures to full strength in coastal heat.'],
      ['Wind tested', 'About a year and a half of testing went into how the tower moves in the wind; a tall tower is designed to sway slightly, not crack.'],
      ['Salt air and water', 'Concrete grade and cover are chosen for the coast. Ask your advisor for the technical sheet.']], image: '' },
    { id: 'progress', kind: 'progress', title: 'Site progress', body: 'Updated every two weeks: roughly one floor every fortnight.', image: '', asOf: '2026-10-28' },
    { id: 'residences', kind: 'residences', title: 'The residences' },
    { id: 'living', kind: 'facts', title: 'Living with a house team', facts: [
      ['Concierge, 24/7', 'Like arriving at a five-star hotel: a front desk and in-house team for anything you need.'],
      ['House management', 'For owners abroad, the team looks after the residence and keeps it ready before you arrive.'],
      ['Connected to the city', 'Cleaning, car service and errands across Mangaluru, arranged through the desk.']], image: '' },
    { id: 'film', kind: 'film', title: 'Yamuna Sky City', body: 'The film: the coast, the tower and the people building it.', videoUrl: '', image: '' },
    { id: 'coast', kind: 'text', title: 'The cultural coast', body: 'Mangaluru sits where the Western Ghats meet the Arabian Sea: temples, fish markets, Yakshagana nights and a coastline the city has never built on. Sky City is planned around that coast.', image: '' },
    { id: 'engineering', kind: 'facts', title: 'The engineering', facts: [
      ['Piling', 'Piles drilled about 25 to 30 metres into the ground, the depth of a ten-storey building, before the first floor rose.'],
      ['The raft', 'Close to 2 metres of concrete poured in one go, with ice in the mix to hold 25 to 27 °C.'],
      ['Wind', 'About a year and a half of wind testing went into how the tower moves; it is designed to sway slightly, not crack.']], image: '' },
    { id: 'design', kind: 'text', title: 'The design', body: 'Every residence is designed around the view, then resolved room by room through Accord: a palette chosen from how you live, and finishes you can see before you choose.', image: '' },
    { id: 'privilege', kind: 'text', title: 'Founding privilege', body: 'Reservations in the current phase carry founding-privilege pricing. Your client advisor will walk you through the residence of your choice and its payment schedule.', image: '' },
    { id: 'close', kind: 'welcome', title: 'Thank you', body: 'Your client advisor will share the residence details and next steps.', image: '' },
  ],
  // 1 Nov: one e-brochure, opened three ways. General has everything; a first visit tells the whole story; a return visit is curated for the person.
  visits: {
    general: ['film', 'address', 'coast', 'engineering', 'design', 'residences', 'interiors', 'structure', 'living', 'availability', 'close'],
    first: ['film', 'address', 'coast', 'engineering', 'design', 'residences', 'interiors', 'structure', 'living', 'availability', 'close'],
    return: ['yours', 'residences', 'interiors', 'availability', 'living', 'close'],
  },
  sop: 'Before a presentation: open the e-brochure from the lead or client (e-Brochure button), choose the visit, check the name and title on the first screen. First visit: let the film play, then scroll at the client\'s pace. Return visit: start from "Your residence". Full screen on the TV, clicker or arrow keys to move between sections. Log the presentation on their file at the end.',
  types: {
    '2 BHK': { plan: '', rooms: { Living: '', Kitchen: '', Bedroom: '', Balcony: '' }, blurb: 'Two-bedroom residences on the podium and typical floors.' },
    '3 BHK': { plan: '', rooms: { Living: '', Dining: '', Kitchen: '', 'Master bedroom': '', Balcony: '' }, blurb: 'Three-bedroom residences with a dining room and wider sea frontage.' },
    '4 BHK': { plan: '', rooms: { Living: '', Dining: '', Kitchen: '', 'Master bedroom': '', Balcony: '' }, blurb: 'Sky residences, sky decks and panorama floors.' },
    '5 BHK': { plan: '', rooms: { Living: '', Dining: '', Kitchen: '', 'Master suite': '', Terrace: '' }, blurb: 'Sky duplexes, the Signature floor and Crown residences.' },
  },
}

export const VIEWING_CHECKLISTS = {
  arrival: ['Gate: name and purpose only; count guests by eye, do not ask', 'Walkie-talkie headcount to the desk', 'Valet and shaded parking ready', 'Chilled water in glasses (one per guest), not bottles', 'Slippers / shoe covers by the door; heels offered slippers in a fresh box', 'Powder room ready: towels, hair dryer, mirror lights', 'Welcome card printed and placed', 'Diffuser on (studio scent)', 'Calendar tab open on the desk laptop', 'Vertical screen playing reels, volume off'],
  site: ['Buggy called by hospitality', 'Client helmets (separate, fresh) and reflective vests', 'Site-appropriate footwear offered', 'Water bottles, umbrellas, parasols in the buggy', 'Site representative briefs safety', 'Passenger lift confirmed', 'Floor order: show 5th, then 10th, then higher', 'Plans and brochure carried', 'Restroom and water offered on arrival back'],
  departure: ['Towels and sanitiser wipes on return', 'Feedback asked by hospitality while waiting for the car (5 questions max)', 'Care package handed over (tier)', 'Car freshener with the studio scent', 'Thank-you message sent the same day'],
}
export const FEEDBACK_QUESTIONS = ['How did you like the visit?', 'Was anything missing or uncomfortable?', 'Which residence or floor stood out?', 'Did you get the information you needed?', 'Anything we can do better next time?']
export const CARE_TIERS = [{ tier: 'Tier 1', for: 'Visitors', contents: 'Sky City stickers, chocolate, illustration card' },
  { tier: 'Tier 2', for: 'Interested', contents: 'Brochure, Sky City notepad, etched bottle' },
  { tier: 'Tier 3', for: 'Serious / booked', contents: 'Brochure, Sky City bag, passport/boarding-pass card, curated gift' }]
export const INTERESTS = ['Luxury', 'Sea and views', 'Engineering', 'Design', 'Mangaluru', 'Investment', 'Family', 'Wellness']
