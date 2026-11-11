// 12 Nov: starting holiday list. Fixed-date national days, plus the 2026 festival days already observed. HR adds the 2027
// festival holidays from the state's notified list (usually published in December) and confirms which the company observes.
const H = (date, name, type, note = '') => ({ id: 'HOL-' + date, date, name, type, note })
export const HOLIDAYS_START = [
  H('2026-10-02', 'Gandhi Jayanti', 'National'),
  H('2026-10-20', 'Mahanavami, Ayudha Pooja', 'Festival', 'Karnataka list 2026'),
  H('2026-10-21', 'Vijayadashami', 'Festival', 'Karnataka list 2026'),
  H('2026-11-01', 'Kannada Rajyotsava', 'National'),
  H('2026-12-25', 'Christmas', 'Festival'),
  H('2027-01-26', 'Republic Day', 'National'),
  H('2027-05-01', 'May Day', 'National'),
  H('2027-08-15', 'Independence Day', 'National'),
  H('2027-10-02', 'Gandhi Jayanti', 'National'),
  H('2027-11-01', 'Kannada Rajyotsava', 'National'),
  H('2027-12-25', 'Christmas', 'Festival'),
]
