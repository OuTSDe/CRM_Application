"""Build Accord seed data from the live CRM Google Sheet export (db.xlsx) and the sourcing trip plan."""
import openpyxl, json, datetime, re, sys

SRC = sys.argv[1]
OUT = sys.argv[2]
wb = openpyxl.load_workbook(SRC, data_only=True)


def iso(v):
    if isinstance(v, datetime.datetime): return v.date().isoformat()
    if isinstance(v, datetime.date): return v.isoformat()
    return v


def clean(v):
    v = iso(v)
    if isinstance(v, str):
        v = v.strip()
        if v in ('', '-', 'None'): return None
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return v


def rows(sheet, hrow, mapping, keycol):
    ws = wb[sheet]
    hdr = [c.value for c in ws[hrow]]
    idx = {}
    for key, label in mapping.items():
        for i, h in enumerate(hdr):
            if h and str(h).strip().lower().startswith(label.lower()):
                idx[key] = i; break
        else:
            raise SystemExit(f'{sheet}: header not found for {key} ({label})')
    out = []
    for r in ws.iter_rows(min_row=hrow + 1, values_only=True):
        if r[idx[keycol]] in (None, ''): continue
        rec = {k: clean(r[i]) for k, i in idx.items()}
        out.append({k: v for k, v in rec.items() if v is not None})
    return out


clients = rows('Client Master', 5, {
    'bookingId': 'Booking ID', 'clientId': 'Client ID', 'unit': 'Unit No', 'status': 'Booking status', 'category': 'Customer category',
    'name': 'Primary applicant', 'coapp': 'Co-applicant', 'buyerType': 'Buyer type', 'entity': 'Entity name', 'phone': 'Mobile (primary)',
    'phone2': 'Mobile (alternate)', 'whatsapp': 'WhatsApp', 'email': 'Email', 'address': 'Correspondence address', 'city': 'City',
    'country': 'State / Country', 'residency': 'Residential status', 'pan': 'PAN', 'aadhaar4': 'Aadhaar', 'dob': 'Date of birth',
    'language': 'Preferred language', 'contactPref': 'Preferred contact', 'purpose': 'Buying purpose', 'occupant': 'Who will live',
    'funding': 'Funding mode', 'lender': 'Lender', 'loanAmount': 'Loan amount', 'loanStatus': 'Loan status', 'bankContact': 'Bank contact',
    'sof': 'Source of funds', 'occupation': 'Occupation', 'employer': 'Employer', 'industry': 'Industry', 'designation': 'Designation',
    'income': 'Annual income', 'marital': 'Marital', 'familyCount': 'Family members', 'familyProfile': 'Family profile',
    'decisionMaker': 'Key decision', 'influencers': 'Influencers', 'otherProps': 'Other properties', 'repeat': 'Existing Yamuna',
    'interestsNote': 'Interests', 'specialDates': 'Special dates', 'source': 'Lead source', 'referredBy': 'Referred by',
    'sourcedBy': 'Sourced by', 'closedBy': 'Closed by', 'owner': 'Relationship owner', 'bookingDate': 'Booking date',
    'tc': 'Total consideration', 'adjustment': 'Adjustment amount', 'adjType': 'Adjustment type', 'adjReason': 'Adjustment reason',
    'plan': 'Payment plan', 'agreement': 'Agreement for sale', 'agreementDate': 'Agreement registration date',
    'agreementNo': 'Registration document', 'history': 'Previous allottee', 'receivedPerCollections': 'Received per collections',
    'remarks': 'Remarks from source', 'notes': 'Internal notes'}, 'bookingId')

payments = rows('Payment Ledger', 5, {
    'entryNo': 'Entry No', 'receiptNo': 'Receipt No', 'date': 'Receipt date', 'unit': 'Unit No', 'payer': 'Received from',
    'thirdParty': 'Third-party', 'amount': 'Amount received', 'counted': 'Counted in totals', 'mode': 'Mode', 'instrument': 'Instrument / UTR',
    'instrumentDate': 'Instrument date', 'bank': 'Drawn on', 'towards': 'Payment towards', 'realisation': 'Realisation', 'tds': 'TDS deducted',
    'ack26qb': 'Form 26QB', 'form16b': 'Form 16B', 'origUnit': 'Unit as on original', 'tcOnReceipt': 'Total consideration on receipt',
    'note': 'Correction'}, 'entryNo')

leads = rows('Leads & Prospects', 5, {
    'id': 'Lead ID', 'date': 'Date captured', 'name': 'Name', 'phone': 'Mobile', 'phone2': 'Other numbers', 'email': 'Email', 'city': 'City',
    'country': 'Country', 'residency': 'Residential status', 'source': 'Lead source', 'cp': 'Channel partner', 'referredBy': 'Referred by',
    'config': 'Configuration interest', 'budget': 'Budget band', 'purpose': 'Purpose', 'timeline': 'Buying timeline', 'owner': 'Assigned to',
    'stage': 'Stage', 'temperature': 'Temperature', 'svDone': 'Site visit done', 'svDate': 'Site visit date', 'lostReason': 'Lost / dormant',
    'convertedTo': 'Converted to', 'notes': 'Notes and call'}, 'id')

interactions = rows('Interaction Log', 5, {
    'id': 'Log ID', 'date': 'Date', 'time': 'Time', 'recordId': 'Client ID or Lead ID', 'mode': 'Mode', 'purpose': 'Purpose', 'by': 'Team member',
    'summary': 'Summary', 'outcome': 'Outcome', 'nextAction': 'Next action', 'nextDate': 'Next action date', 'nextOwner': 'Next action owner',
    'status': 'Status'}, 'id')
for x in interactions:
    if isinstance(x.get('time'), datetime.time): x['time'] = x['time'].strftime('%H:%M')
    elif 'time' in x and not isinstance(x['time'], str): x.pop('time')

team = rows('Team', 5, {'id': 'Member ID', 'name': 'Name', 'team': 'Team', 'role': 'Role', 'resp': 'Responsibilities', 'phone': 'Phone',
                        'email': 'Email', 'reportsTo': 'Reports to', 'active': 'Active'}, 'id')

units = rows('Unit Inventory', 5, {'unit': 'Unit No', 'floor': 'Floor', 'pos': 'Position', 'type': 'Type', 'area': 'Saleable area',
                                   'terrace': 'Terrace', 'band': 'Floor band', 'remarks': 'Remarks'}, 'unit')

issues = rows('Issues Log', 5, {'id': 'Issue ID', 'date': 'Date raised', 'category': 'Category', 'severity': 'Severity', 'unit': 'Unit',
                                'description': 'Description', 'source': 'Source', 'action': 'Suggested action', 'owner': 'Owner',
                                'status': 'Status', 'resolution': 'Resolution notes', 'resolvedOn': 'Resolved on'}, 'id')

# documents matrix
ws = wb['Documents']
hdr = [c.value for c in ws[5]]; grp = []
cur = None
for c in ws[4]:
    if c.value: cur = c.value
    grp.append(cur)
doc_cols = [(i, h, grp[i]) for i, h in enumerate(hdr) if i >= 6 and h and grp[i] and 'SUMMARY' not in str(grp[i])]
doc_types = []
for i, h, g in doc_cols:
    key = re.sub(r'[^a-z0-9]+', '_', h.lower()).strip('_')
    doc_types.append({'key': key, 'label': h, 'group': g.title()})
documents = []
for r in ws.iter_rows(min_row=6, values_only=True):
    if not r[0]: continue
    items = {}
    for (i, h, g), t in zip(doc_cols, doc_types):
        if r[i]: items[t['key']] = r[i]
    documents.append({'bookingId': r[0], 'items': items})

# payment slabs: CLP and demand calls
ws = wb['Payment Slabs']
clp, calls, settings = [], [], {}
for r in ws.iter_rows(min_row=1, values_only=True):
    pass
vals = list(ws.iter_rows(values_only=True))
for row in vals:
    if row[0] == 'GST on demand': settings['gst'] = row[2]
    if row[0] and str(row[0]).startswith('Payment due within'): settings['dueDays'] = row[2]
    if row[0] == 'RERA advance threshold': settings['rera'] = row[2]
    if row[0] and str(row[0]).startswith('Contact gap'): settings['contactRed'] = row[2]
mode = None
for row in vals:
    if row[0] and str(row[0]).startswith('CONSTRUCTION-LINKED'): mode = 'clp'; continue
    if row[0] and str(row[0]).startswith('MILESTONE'): mode = None; continue
    if row[0] and str(row[0]).startswith('DEMAND CALLS'): mode = 'dc'; continue
    if mode == 'clp' and isinstance(row[0], (int, float)) and row[1]:
        clp.append({'no': int(row[0]), 'stage': row[1], 'pct': row[2], 'planned': iso(row[4]), 'actual': iso(row[5]), 'status': row[6]})
    if mode == 'dc' and row[0] and str(row[0]).startswith('DC-'):
        if row[3] not in (None, ''):
            calls.append({'id': row[0], 'description': row[1], 'stage': row[2], 'pct': row[3], 'raisedOn': iso(row[5]), 'notes': row[7]})

# demand schedule extras: collections file outstanding + forecast
ws = wb['Demand Schedule']
hdr = [c.value for c in ws[5]]
def col(label):
    for i, h in enumerate(hdr):
        if h and str(h).startswith(label): return i
fx = {}
for r in ws.iter_rows(min_row=6, values_only=True):
    if not r[0]: continue
    fx[r[0]] = {k: clean(r[col(l)]) for k, l in (('outstandingPerCollections', 'Total outstanding per collections'), ('expOct', 'Expected Oct'), ('expNov', 'Expected Nov'), ('expDec', 'Expected Dec'))}
for c in clients:
    for k, v in fx.get(c['bookingId'], {}).items():
        if v is not None: c[k] = v

ws = wb['Lists']
lists = {}
for col in ws.iter_cols(min_row=4, values_only=True):
    if col[0]: lists[col[0]] = [v for v in col[1:] if v not in (None, '')]
seed = dict(lists=lists, units=units, clients=clients, payments=payments, leads=leads, interactions=interactions, team=team, issues=issues,
            documents=documents, docTypes=doc_types, clpStages=clp, demandCalls=calls, sheetSettings=settings)
json.dump(seed, open(OUT, 'w'), ensure_ascii=False, indent=0, default=str)
print({k: len(v) for k, v in seed.items() if isinstance(v, list)}, settings)
