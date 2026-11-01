// The Drive folder tree under Accord_Data (1 Nov: "upload through the app, auto-rename, proper hierarchy").
// The server (Code.gs upload_) creates any folder that is missing and never overwrites: a second file the same day gets _2.
export const CLIENT_FOLDER = { Kyc: '01 KYC', Nri: '01 KYC', 'Entity Buyer': '01 KYC', Booking: '02 Booking', Agreement: '03 Agreement and legal', 'Home Loan': '04 Home loan',
  'Payments & Tax': '05 Receipts', Changes: '07 Changes', Possession: '08 Possession' }
export const clientRoot = (c) => `Clients/${c.unit} ${c.name || ''}`.trim()
export const clientFolder = (c, sub) => `${clientRoot(c)}/${sub}`
export const RECEIPTS = '05 Receipts', COST_SHEETS = '06 Cost sheets', SESSIONS = '09 Accord sessions', CORRESPONDENCE = '10 Correspondence', OTHER = '11 Other'
export const PROJECT_CATS = ['Legal', 'Approvals', 'Forms and templates', 'Marketing', 'Site progress']
export const slug = (s) => String(s || '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
// flat_clientID_document_date, the naming rule from the 29 Oct meeting
export const fileName = (c, doc, date) => [c.unit, c.clientId, slug(doc), date].filter(Boolean).join('_')
