// Practice data for the help videos. Every person, number and amount here is invented.
// Runs inside the page: takes Accord's local database (the seed) and returns it with demo records added.
window.__accordDemo = function (db) {
  const DAY = 864e5
  const iso = (t) => new Date(t).toISOString().slice(0, 10)
  const today = Date.now()
  const ago = (n) => iso(today - n * DAY)
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const pick = (a) => a[Math.floor(rnd() * a.length)]
  const phone = () => '98' + String(4500000 + Math.floor(rnd() * 4400000)).padStart(8, '0')
  // the demo team: one admin who records the videos, and three practice advisors
  const extra = [
    { id: 'T-91', name: 'Demo Admin', team: 'Management', role: 'Practice account', designation: 'Accord trainer', appRole: 'admin' },
    { id: 'T-92', name: 'Priya Rao', team: 'Sales', role: 'Practice advisor', designation: 'Client advisor', appRole: 'sales', reportsTo: 'Rohan Kamath' },
    { id: 'T-93', name: 'Rohan Kamath', team: 'Sales', role: 'Practice senior', designation: 'Sales lead', appRole: 'senior', reportsTo: 'Demo Admin' },
    { id: 'T-94', name: 'Neha Shetty', team: 'Accounts', role: 'Practice finance', designation: 'Accounts executive', appRole: 'finance', reportsTo: 'Demo Admin' },
  ].map((t) => ({ ...t, username: t.name.toLowerCase().replace(/[^a-z]/g, ''), shiftStart: '09:30', shiftEnd: '18:30', workDays: 'Mon-Sat', remoteAllowed: 'Yes',
    phone: phone(), email: t.name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com', deviceLock: 'No', devices: [], active: 'Yes', mustChange: 'No', pwSalt: '', pwHash: '', department: t.team, employment: 'On roll', company: 'Practice' }))
  db.users = [...db.users.map((u) => ({ ...u, mustChange: 'No' })), ...extra]
  const s = db.settings[0]
  db.settings[0] = { ...s, authMode: 'password', trustDays: 0, company: { ...s.company, account: 'XXXXXXX0000', contact: '0000000000' }, idleMinutes: 600 }
  db.demandCalls = db.demandCalls.map((c) => (c.raisedOn ? c : { ...c, raisedOn: ago(150) }))

  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Mr. and Mrs.']
  const people = ['Arjun Hegde', 'Kavya Nayak', 'Rahul Pai', 'Sneha Kini', 'Vikram Bhandary', 'Ananya Shenoy', 'Farhan Sheikh', 'Meera Prabhu', 'Joel DSouza', 'Ritika Kamath',
    'Sandeep Alva', 'Divya Rai', 'Imran Bava', 'Shreya Mallya', 'Karthik Bhat', 'Nisha Menon', 'Aditya Suvarna', 'Pooja Acharya', 'Rohit Salian', 'Lavina Pinto',
    'Harish Poojary', 'Sanjana Rego', 'Nikhil Kotian', 'Tanvi Baliga']
  const cities = ['Mangaluru', 'Udupi', 'Bengaluru', 'Dubai', 'Mumbai', 'Pune', 'Muscat', 'Manipal', 'Puttur', 'Doha']
  const owners = ['Priya Rao', 'Rohan Kamath', 'Priya Rao', 'Rohan Kamath', 'Priya Rao']
  const free = db.units.filter((u) => u.floor >= 5)
  const used = new Set()
  const unitFor = (i) => { let u; do { u = free[Math.floor(rnd() * free.length)] } while (used.has(u.unit)); used.add(u.unit); return u }
  const docKeys = ['pan_primary_applicant', 'aadhaar_primary_applicant', 'photograph_primary', 'address_proof_primary', 'booking_application_form', 'signed_cost_sheet', 'allotment_letter', 'payment_plan_acknowledgement']
  const clients = [], payments = [], documents = [], interactions = []
  let rec = 1, ent = 1, int = 1
  people.forEach((nm, i) => {
    const u = unitFor(i)
    const n = String(i + 1).padStart(3, '0')
    const bookedAgo = 60 + Math.floor(rnd() * 420)
    const tc = Math.round((u.area * (10500 + (u.floor - 3) * 40) + 600000) / 1000) * 1000
    const funding = i % 3 === 0 ? 'Bank loan' : i % 5 === 0 ? 'Self + bank loan' : 'Self'
    const c = { id: 'YSC-B-' + n, bookingId: 'YSC-B-' + n, clientId: 'YSC-C-' + n, unit: u.unit, status: i === 21 ? 'To verify' : 'Active', category: pick(['Retail', 'Retail', 'Referral', 'Channel partner']),
      title: i % 7 === 3 ? '' : pick(titles), name: nm, buyerType: 'Individual', phone: phone(), whatsapp: '', email: nm.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
      city: pick(cities), residency: i % 6 === 2 ? 'NRI' : 'Resident', purpose: pick(['Self-use', 'Investment - capital appreciation', 'Family use (parents / children)']), funding,
      lender: funding === 'Self' ? '' : pick(['Practice Bank', 'Demo Housing Finance']), loanStatus: funding === 'Self' ? 'Not applicable' : pick(['Sanctioned', 'Disbursing', 'Applied']),
      source: pick(['Walk-in', 'Website', 'Referral - existing client', 'Channel partner', 'WhatsApp']), owner: i === 9 || i === 17 ? '' : owners[i % owners.length], coOwners: [],
      bookingDate: ago(bookedAgo), tc, plan: 'Construction-linked plan', agreement: bookedAgo > 120 ? 'Registered' : 'Signed', agreementDate: bookedAgo > 120 ? ago(bookedAgo - 40) : '', interests: [] }
    clients.push(c)
    // payments: booking advance, agreement, and stage payments for the older bookings
    const share = [[0.1, 'Booking advance', bookedAgo - 2], [0.1, 'On agreement', bookedAgo - 35]]
    if (bookedAgo > 150) share.push([0.2, 'Construction milestone', bookedAgo - 110])
    if (bookedAgo > 260) share.push([0.06, 'Construction milestone', 40 + Math.floor(rnd() * 40)])
    share.forEach(([p, towards, a], k) => {
      if (a < 1 || (i % 8 === 5 && k > 0)) return            // a few clients behind on payments
      payments.push({ id: 'P-' + String(ent).padStart(4, '0'), entryNo: ent++, receiptNo: 'YSC/R/' + String(rec++).padStart(4, '0'), date: ago(a), unit: u.unit, payer: c.name, amount: Math.round(tc * p),
        counted: 'Yes', mode: pick(['NEFT', 'RTGS', 'UPI', 'Cheque']), instrument: 'UTR' + Math.floor(rnd() * 1e9), towards, realisation: 'Cleared', tds: 0 })
    })
    // most clients are up to date with the 49% demanded so far; a few are behind
    if (i % 4 !== 1 && bookedAgo > 100) { const paid = payments.filter((p) => p.unit === u.unit).reduce((x, p) => x + p.amount, 0); const due = Math.round(tc * 0.49) - paid
      if (due > 0) payments.push({ id: 'P-' + String(ent).padStart(4, '0'), entryNo: ent++, receiptNo: 'YSC/R/' + String(rec++).padStart(4, '0'), date: ago(5 + (i % 20)), unit: u.unit, payer: c.name, amount: due, counted: 'Yes', mode: 'NEFT', instrument: 'UTR' + Math.floor(rnd() * 1e9), towards: 'Construction milestone', realisation: 'Cleared', tds: 0 }) }
    const items = {}; docKeys.forEach((k, j) => { items[k] = j < 3 + (i % 5) ? 'Received' : 'Pending' })
    documents.push({ id: c.bookingId, bookingId: c.bookingId, items, files: {} })
    interactions.push({ id: 'I-' + String(int++).padStart(4, '0'), date: ago(3 + (i % 9)), time: '11:30', recordId: c.clientId, recordName: c.name, type: 'Client', mode: pick(['Call - outgoing', 'WhatsApp']),
      purpose: pick(['Payment reminder', 'Document collection', 'Relationship check-in']), by: c.owner || 'Rohan Kamath', summary: pick(['Shared the stage update; will pay after the 15th.', 'Asked for the pending KYC copies.', 'Wanted the parking details; explained the allotment.']),
      outcome: pick(['Positive', 'Payment committed', 'Neutral']), nextDate: i % 4 === 0 ? ago(-1) : i % 4 === 1 ? ago(0) : '', nextTime: '15:00', nextOwners: [c.owner || 'Rohan Kamath'], nextOwner: c.owner || 'Rohan Kamath', status: i % 4 < 2 ? 'Open' : 'Done' })
  })
  const leadNames = ['Varun Shetty', 'Aisha Khan', 'Prakash Gowda', 'Smitha Bangera', 'Kiran Rao', 'Deepa Holla', 'Manoj Nair', 'Shalini Fernandes', 'Ganesh Upadhya', 'Rekha Moily',
    'Suresh Karkera', 'Asha Lobo', 'Vinay Kudva', 'Preethi Shanbhag', 'Abdul Rahman', 'Naveen Amin', 'Chaitra Bhat', 'Melwyn Saldanha', 'Rajesh Kulal', 'Anita Tellis']
  const stages = ['New', 'New', 'Contacted', 'Qualified', 'Site visit scheduled', 'Site visit done', 'Negotiation', 'Contacted', 'Lost', 'Dormant']
  const leads = leadNames.map((nm, i) => ({ id: 'YSC-L-' + String(i + 1).padStart(4, '0'), date: ago(1 + i * 4), title: pick(['Mr.', 'Ms.', 'Mrs.', 'Dr.']), name: nm, phone: phone(),
    email: i % 6 === 4 ? '' : nm.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com', city: pick(cities), country: 'India', source: pick(['99acres', 'Website', 'Walk-in', 'WhatsApp', 'Channel partner', 'Hoarding']),
    cp: i % 5 === 2 ? 'CP-001' : '', config: pick(['2 BHK', '3 BHK', '4 BHK']), budget: pick(['1.5 - 2.5 Cr', '2.5 - 4 Cr', '4 - 6 Cr']), timeline: pick(['Within 3 months', '3 - 6 months', 'Exploring']),
    owner: i === 3 || i === 11 ? '' : owners[i % owners.length], coOwners: [], stage: stages[i % stages.length], temperature: pick(['Hot', 'Warm', 'Warm', 'Cold']),
    lostReason: stages[i % stages.length] === 'Lost' ? 'Budget' : '', interests: [] }))
  leads.slice(0, 12).forEach((l, i) => interactions.push({ id: 'I-' + String(int++).padStart(4, '0'), date: ago(1 + i), time: '12:10', recordId: l.id, recordName: l.name, type: 'Lead', mode: 'Call - outgoing',
    purpose: 'Follow-up', by: l.owner || 'Rohan Kamath', summary: 'Spoke about ' + l.config + ' options and the private viewing.', outcome: i % 3 ? 'Positive' : 'Call back requested',
    nextDate: i % 3 === 0 ? ago(0) : i % 3 === 1 ? ago(-2) : '', nextTime: i % 2 ? '10:00' : '17:00', nextOwners: [l.owner || 'Rohan Kamath'], nextOwner: l.owner || 'Rohan Kamath', status: i % 3 < 2 ? 'Open' : 'Done' }))
  const viewings = [0, 1, 2, 4].map((k, i) => ({ id: 'V-' + String(i + 1).padStart(3, '0'), recordId: leads[k].id, name: leads[k].name, date: ago(-i), time: ['11:00', '15:30', '12:00', '16:30'][i], guests: 2 + (i % 3),
    advisor: owners[i], purpose: 'First private viewing', status: 'Planned', interests: [] }))
  db.clients = clients; db.payments = payments; db.documents = documents; db.leads = leads; db.interactions = interactions; db.viewings = viewings
  db.partners = [{ id: 'CP-001', name: 'Coastline Realty (practice)', city: 'Mangaluru', status: 'Active', contact: 'Practice partner', phone: phone() }, { id: 'CP-002', name: 'Harbour Homes Advisory (practice)', city: 'Dubai', status: 'Active', contact: 'Practice partner', phone: phone() }]
  db.tasks = [{ id: 'TK-0001', title: 'Collect pending KYC for 3 clients', owner: 'Priya Rao', by: 'Rohan Kamath', due: ago(-1), priority: 'High', status: 'Open', module: 'CRM' },
    { id: 'TK-0002', title: 'Share stage certificate with finance', owner: 'Neha Shetty', by: 'Demo Admin', due: ago(-3), priority: 'Medium', status: 'Open', module: 'CRM' }]
  db.issues = [{ id: 'IS-001', date: ago(4), category: 'Missing data', severity: 'Medium', unit: clients[3].unit, description: 'Co-applicant PAN not recorded.', owner: 'Priya Rao', status: 'Open' }]
  db.leadInbox = [{ id: 'LI-001', status: 'New', at: new Date(today - 3600e3).toISOString(), source: 'Website', name: 'Rakesh Pai', phone: phone(), email: 'rakesh.pai@example.com', message: 'Interested in a 3 BHK on a higher floor. Please call after 5 pm.' }]
  db.notifications = []; db.audit = []; db.attendance = []; db.timeEvents = []; db.files = []
  return db
}
