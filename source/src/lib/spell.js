// 2 Nov: spelling. The browser's own checker underlines mistakes as you type (English, India); right-click or tap a word
// for suggestions. It is on for sentences (notes, summaries, messages, remarks) and off for names, numbers, IDs and
// e-mails, where it would only flag correct Indian names and codes. On top of it, a short list of common slips is
// fixed when you leave a notes box.
const FIX = {
  recieved: 'received', recieve: 'receive', reciept: 'receipt', reciepts: 'receipts', adress: 'address', adresses: 'addresses',
  definately: 'definitely', seperate: 'separate', seperately: 'separately', untill: 'until', tommorow: 'tomorrow', tommorrow: 'tomorrow', tomorow: 'tomorrow',
  wich: 'which', accomodation: 'accommodation', occured: 'occurred', payement: 'payment', paymnet: 'payment', pyment: 'payment',
  intrested: 'interested', intersted: 'interested', intrest: 'interest', availble: 'available', availabe: 'available', avilable: 'available',
  apartmnet: 'apartment', appartment: 'apartment', appartments: 'apartments', buisness: 'business', calender: 'calendar', commited: 'committed',
  enquery: 'enquiry', enquries: 'enquiries', sucessful: 'successful', succesful: 'successful', documnet: 'document', documnets: 'documents', docuement: 'document',
  beleive: 'believe', thier: 'their', alot: 'a lot', becuase: 'because', becasue: 'because', befor: 'before', confrim: 'confirm', confirmd: 'confirmed',
  meeeting: 'meeting', meting: 'meeting', shedule: 'schedule', scheduel: 'schedule', schedual: 'schedule', recomend: 'recommend', reccomend: 'recommend',
  responce: 'response', resposne: 'response', agreemnet: 'agreement', agrement: 'agreement', registeration: 'registration', regestration: 'registration',
  visted: 'visited', vist: 'visit', folow: 'follow', follwo: 'follow', followup: 'follow-up', interseted: 'interested', clinet: 'client', cleint: 'client',
  cliet: 'client', budjet: 'budget', bugdet: 'budget', finalise: 'finalise', possesion: 'possession', posession: 'possession', recived: 'received', recive: 'receive',
  teh: 'the', adn: 'and', taht: 'that', wiht: 'with', woudl: 'would', shoudl: 'should', coudl: 'could', dont: "don't", didnt: "didn't", cant: "can't", wont: "won't",
}
const RX = new RegExp('\\b(' + Object.keys(FIX).join('|') + ')\\b', 'gi')
export function fixCommon(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(RX, (w) => { const r = FIX[w.toLowerCase()]; return w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? r[0].toUpperCase() + r.slice(1) : r })
}
// fields that hold names, numbers, codes or addresses: no underlines there
export const NO_SPELL = /(^|_)(id|name|title|phone|phone2|whatsapp|email|pan|aadhaar|unit|city|country|partner|referredBy|instrument|bank|loanBank|username|owner|by|ifsc|account|gstin|rera|pincode|coapp|employer|nominee|passport|oci|fatherName|decisionMaker|receiptNo|recordId|clientId|bookingId|leadId|payer|thirdParty|brands|website|url|link)$/i
