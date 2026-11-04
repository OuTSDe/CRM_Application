// 2 Nov: a short user guide inside Accord, so new people can find their way without a training session.
// Each person sees the parts for their role first; everything else is folded underneath.
import React from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { ROLES } from '../lib/perms.js'
import { Page, Card } from '../components/ui.jsx'

const ALL = [
  { id: 'start', title: 'Signing in and your day', roles: ['*'], items: [
    'Sign in with your username and the 6-digit code from the authenticator app on your phone. Each person can use one computer and one phone; a new device waits for an admin to approve it.',
    'Accord asks you to sign in again whenever the page is refreshed or closed, and signs you out after a spell with no activity. Save your work before stepping away.',
    'Punch in from the clock at the top. At Sky City it counts as Office; elsewhere it is logged as Remote. Use Break for lunch, tea or a personal break, and Site visit when you go out. Punch out at the end of the day.',
    'While you are punched in at the office, Accord checks your location every 15 minutes. If you leave, it marks you as Remote. During a site visit it reminds you every hour.',
    'Training mode (in the menu under your name) lets you practise. Nothing you enter while it is on is saved, and it is all wiped when you switch it off.',
    'Every text box checks spelling as you type. Words underlined in red can be fixed with a right-click.'] },
  { id: 'leads', title: 'Leads', roles: ['admin', 'senior', 'sales'], items: [
    'Leads › New lead. Name, mobile and e-mail are needed; a mobile already on another lead is flagged before saving.',
    'Paste an enquiry: copy a WhatsApp or 99acres message into the box and Accord fills in the name, number, e-mail, city and BHK for you to check.',
    'Inbox: enquiries sent in by the website or other tools wait here. Accept turns one into a lead (you check it first); Reject moves it out.',
    'Add colleagues under "Also responsible" when more than one person handles a lead. They see it and get its follow-ups.',
    'Views at the top of the table: follow-ups due, never contacted, no follow-up set, missing details. Fill in the gaps when you speak to the person.',
    'When a lead is lost, pick the reason. Accord offers a short closing message by WhatsApp and closes its open follow-ups.',
    'Admins can delete a lead from its page (Delete lead). This cannot be undone, so use Lost for real enquiries.'] },
  { id: 'log', title: 'Logging calls and follow-ups', roles: ['admin', 'senior', 'sales', 'finance'], items: [
    'Log interaction (top of the dashboard) after every call, visit or message. Set the next follow-up date and time (or tap a quick time). The reminder comes to you, and to everyone picked as a follow-up owner, at that time on that day.',
    'Log several at once: one row per person. "Same for every row" fills the same message (for example festival wishes) into every row in one go.',
    'A follow-up left open for too long is escalated to your manager, then one level up.'] },
  { id: 'clients', title: 'Clients, documents and cost sheets', roles: ['admin', 'senior', 'sales'], items: [
    'Client 360 has everything about a booking: details, payments status, papers, history and messages.',
    'Documents: upload each paper against its line. Files are renamed and filed in the client\'s folder in the OuTSDe Drive. Photos, PDFs, Word and Excel files are accepted, up to 35 MB each.',
    'Uploaded the wrong file? Press Files (n) on that line, or look under All uploaded files at the bottom. View shows the file; Delete removes it (only the person who uploaded it, or an admin). Then upload the right one.',
    'Cost sheet: pick a residence that is free. Booked, on-hold and to-verify residences cannot be offered. Covered car parks come with the type; extra car parks are priced separately.',
    'Seniors and admins can round the total to a clean figure; the rounding adjustment is shown on the sheet.',
    'Send the cost sheet by WhatsApp or e-mail from the sheet itself. Upload the agreed cost sheet against the client when it is signed.'] },
  { id: 'money', title: 'Payments and receipts', roles: ['admin', 'finance'], items: [
    'Payments › Record payment. Each entry gets a receipt number and an A4 receipt to print or save as PDF.',
    'Print receipts in bulk: choose a date range (and a residence if needed); every receipt prints on its own page in one go.',
    'Building and parking › Construction: keep each stage\'s status and dates up to date. Demand calls follow the completed stages.'] },
  { id: 'team', title: 'Team, time and performance', roles: ['admin', 'senior'], items: [
    'Team shows who reports to whom, department and on roll / off roll / consultant.',
    'Time shows punches and breaks for each person, with the reason for each break.',
    'Team › Analytics, Leads tab: leads by week or month, source, advisor and stage, how far they get and why they were lost.'] },
  { id: 'analytics', title: 'Analytics', roles: ['*'], items: [
    'Team › Analytics has three parts. Each person sees only the parts for their role.',
    'Leads: for the sales team and admins. Advisors see the figures for their own leads.',
    'Finance: for finance and admins. Collections by month and mode, outstanding and how old it is, the largest amounts due.',
    'Overall: for admins only. Bookings, booking value, collections, the lead pipeline and team activity on one page.',
    'Pick 30 days, 90 days, 1 year or all time at the top.'] },
  { id: 'admin', title: 'Admin', roles: ['admin'], items: [
    'Users and access: add a person, give them a role and platforms, and send the authenticator set-up. Add department, employment and company for the team view.',
    'Extra access: open a person in Users and access and go to Pages and permissions. Greyed ticks come with their role; tick any other page or power (for example Analytics: finance, or Record payments) to give it to that person only. To match a colleague, use Same access as, pick them, choose Client 360 only or Everything, then Give and Save.',
    'Settings: the rate card (base rate, floor rise, car parks, MESCOM and others), payment plans and terms. Everyone is told when these change, with what changed.',
    'Settings › Lead inbox: make a key and give the address to the website or WhatsApp tool that should send enquiries in.',
    'Settings › Sign out after no activity: how many minutes before Accord signs a person out.',
    'Data and sync shows the Google Sheet connection. All data lives in the OuTSDe Drive under Accord_Data.'] },
]

export default function Help() {
  const { user } = useStore()
  const mine = (s) => s.roles.includes('*') || s.roles.includes(user.appRole) || user.appRole === 'admin'
  const first = ALL.filter(mine), rest = ALL.filter((s) => !mine(s))
  return (
    <Page title="User guide" back="/" backLabel="Dashboard" subtitle={`How to use Accord. You are signed in as ${ROLES[user.appRole] || user.appRole}; your parts come first.`}>
      <div className="help">
        {first.map((s) => <Card key={s.id} title={s.title}><ul>{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>)}
        {rest.length > 0 && <details><summary className="small">Other roles</summary>{rest.map((s) => <Card key={s.id} title={s.title}><ul>{s.items.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>)}</details>}
        <p className="small muted">Something missing or wrong? Tell an admin, or log it under <Link to="/crm/issues">Issues</Link>.</p>
      </div>
    </Page>
  )
}
