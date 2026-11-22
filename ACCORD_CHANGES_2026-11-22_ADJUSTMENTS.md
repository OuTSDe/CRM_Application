# Accord 3.9.0 · 22 Nov 2026 · adjustments and non-official payment sources removed

Asked by Sanath (admin). The full record of what was removed is kept offline only, in
`Downloads/Accord_Removed_Adjustments_2026-11-22.xlsx` on Sanath's laptop. It is not in Drive or GitHub.

## Data (Accord Database and every dated copy in Accord_Data / Backups)
- **Booking adjustments.** The `Adjustment (₹)` and `Adjustment type` columns and the adjustment reason are removed from 28 bookings (GST excluded, Furniture / barter, Other). The basis for demands is now the total consideration.
- **Customer category.** 10 bookings in *Adjusted sale* are moved to *Retail*.
- **Receipts without an official payment mode.** L-0048, L-0064 and L-0091 are deleted.
- **Issue Q-065** (about the adjustments) is deleted. The KB line in YSC-PS-02 now says that the demand is the consideration times the stage percentage, plus GST.
- `migrate390_` runs once, on the first request after the backend is deployed. `cleanBackups390` then cleans the backups in the background and writes a fresh Exports / Accord Database.xlsx.
- Only the listed records are changed. Anything else that still looks like an adjustment is written to the Apps Script execution log, not deleted. No amounts or reasons are written to the sheet or the audit tab.

## App
- Client record: the adjustment fields and the "Adjustment …" line on the consideration tile are removed. The statement of account no longer shows "Less adjustment".
- Payments: the *Ledger entry only, no receipt* option is removed, and *Furniture adjustment* and *Other* are removed from *Towards*. Every entry gets a receipt.
- Lists: *Adjustment type* and the *Adjusted sale* category are removed.
- The demand letter, schedule, forecast, reports and calc all use the total consideration.
- The help article "Furniture, barter and other adjustments" is removed, along with the README and BACKEND mentions.
- Server (`push_`): adjustment fields sent by an older browser are dropped. A payment is refused when its mode is not an official one (NEFT, RTGS, IMPS, UPI, Cheque, Demand Draft, Bank Transfer, Loan disbursement) or when *Towards* is a removed type.
- Unchanged: the cost sheet's *rounding adjustment* (price rounding on a quotation, not a payment adjustment).
