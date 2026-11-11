// Short help videos: screen recordings of Accord with made-up clients (no real names, numbers or amounts),
// with titles, captions and pointers. Files live in site/help/videos/<name>.mp4 (and .jpg for the still).
export const VIDEOS = [
  { name: 'sign-in-and-punch-in', title: 'Sign in and start your day', article: 'punch-in' },
  { name: 'new-lead', title: 'Add a lead, or paste an enquiry', article: 'new-lead' },
  { name: 'log-interaction', title: 'Log a call and set the follow-up', article: 'log-interaction' },
  { name: 'client-360', title: 'Find your way round Client 360', article: 'client-360' },
  { name: 'cost-sheet', title: 'Make and send a cost sheet', article: 'cost-sheet' },
  { name: 'record-payment', title: 'Record a payment and print the receipt', article: 'record-payment' },
  { name: 'demand-letters', title: 'Raise and print demand letters', article: 'raise-demand' },
  { name: 'cancel-or-move', title: 'Cancel or move a booking', article: 'cancel-booking' },
  { name: 'building', title: 'The building, the tower and the plans', article: 'tower' },
  { name: 'car-parking', title: 'Plan the car park allotment', article: 'parking-plan' },
  { name: 'private-viewing', title: 'Plan and run a private viewing', article: 'plan-viewing' },
  { name: 'e-brochure', title: 'Present the e-brochure', article: 'ebrochure-present' },
  { name: 'analytics-and-reports', title: 'Analytics and printable reports', article: 'analytics' },
]
export const VIDEO_BY_NAME = Object.fromEntries(VIDEOS.map((v) => [v.name, v]))
export const videoSrc = (name) => `help/videos/${name}.mp4`
export const videoPoster = (name) => `help/videos/${name}.jpg`
