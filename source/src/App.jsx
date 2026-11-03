import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './lib/store.jsx'
import { canOpen } from './lib/perms.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Experience from './modules/experience/Experience.jsx'
import Enrol from './pages/Enrol.jsx'
import { DataCleanup } from './modules/admin/Cleanup.jsx'
import { PaymentSummary } from './modules/crm/Statement.jsx'
import { ChangePassword } from './components/Layout.jsx'
import CrmDashboard from './modules/crm/Dashboard.jsx'
import { Leads, LeadDetail } from './modules/crm/Leads.jsx'
import { Clients, Client360 } from './modules/crm/Clients.jsx'
import Interactions from './modules/crm/Interactions.jsx'
import { Payments, Receipt, BulkReceipts } from './modules/crm/Payments.jsx'
import Analytics from './modules/crm/Analytics.jsx'
import Help from './pages/Help.jsx'
import CostSheet from './modules/crm/CostSheet.jsx'
import BookingForm, { ClientApply } from './modules/crm/Booking.jsx'
import Inventory from './modules/crm/Inventory.jsx'
import Documents from './modules/crm/Documents.jsx'
import Messages from './modules/crm/Messages.jsx'
import Issues from './modules/crm/Issues.jsx'
import { TimeTracker, Performance, Tasks, Team } from './modules/people/People.jsx'
import { Viewings, ViewingDetail } from './modules/presales/Viewings.jsx'
import Showcase from './modules/presales/Showcase.jsx'
import Brochure from './modules/presales/Brochure.jsx'
import BrochureScroll from './modules/presales/BrochureScroll.jsx'
import { Vendors, VendorDetail, VendorApply } from './modules/vendors/Vendors.jsx'
import { Trips, TripDetail, Quotes, Compare, Samples } from './modules/sourcing/Sourcing.jsx'
import { Projects, ProjectDetail } from './modules/accord/Accord.jsx'
import { Residences } from './modules/crm/Inventory.jsx'
import { AdminSettings, AdminUsers, AdminData } from './modules/admin/Admin.jsx'

function Gate({ mod, children }) {
  const { user } = useStore()
  if (!canOpen(user, mod)) return <div className="empty"><h3>Not part of your access</h3><p>Your role does not include this. Ask an admin if you need it.</p></div>
  return children
}
const G = (mod, el) => <Gate mod={mod}>{el}</Gate>

export default function App() {
  const { toast } = useStore()
  return <>{<Main />}{toast && <div className={'toast t-' + toast.tone}>{toast.msg}</div>}</>
}
function Main() {
  const { user, session, settings } = useStore()
  const loc = useLocation()
  if (loc.pathname === '/apply/vendor' && !user) return <VendorApply publicMode />
  if (loc.pathname === '/apply/client') return <ClientApply />
  if (!user) return <Login />
  if (session?.mustEnrol) return <Enrol />
  if (user.mustChange === 'Yes' && settings.authMode === 'password') return <div className="login"><ChangePassword forced /></div>
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/brochure" element={G('brochure', <BrochureScroll />)} />
      <Route path="/brochure/slides" element={G('brochure', <Brochure />)} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="crm" element={G('crm', <CrmDashboard />)} />
        <Route path="crm/leads" element={G('crm', <Leads />)} />
        <Route path="crm/leads/:id" element={G('crm', <LeadDetail />)} />
        <Route path="crm/clients" element={G('crm', <Clients />)} />
        <Route path="crm/clients/:id" element={G('crm', <Client360 />)} />
        <Route path="crm/interactions" element={G('crm', <Interactions />)} />
        <Route path="crm/payments" element={G('crm', <Payments />)} />
        <Route path="crm/payments/receipts" element={G('crm', <BulkReceipts />)} />
        <Route path="crm/analytics" element={G('performance', <Analytics />)} />
        <Route path="help" element={G('help', <Help />)} />
        <Route path="crm/payments/receipt/:id" element={G('crm', <Receipt />)} />
        <Route path="crm/clients/:id/statement" element={G('crm', <PaymentSummary />)} />
        <Route path="crm/cost-sheet" element={G('crm', <CostSheet />)} />
        <Route path="crm/booking/:id" element={G('crm', <BookingForm />)} />
        <Route path="crm/inventory" element={G('crm', <Inventory />)} />
        <Route path="crm/documents" element={G('crm', <Documents />)} />
        <Route path="crm/messages" element={G('crm', <Messages />)} />
        <Route path="crm/issues" element={G('crm', <Issues />)} />
        <Route path="people" element={G('people', <TimeTracker />)} />
        <Route path="people/performance" element={G('performance', <Performance />)} />
        <Route path="people/team" element={G('people', <Team />)} />
        <Route path="experience" element={G('experience', <Experience />)} />
        <Route path="people/tasks" element={G('people', <Tasks />)} />
        <Route path="presales" element={G('presales', <Viewings />)} />
        <Route path="presales/viewings/:id" element={G('presales', <ViewingDetail />)} />
        <Route path="presales/showcase" element={G('presales', <Showcase />)} />
        <Route path="vendors" element={G('vendors', <Vendors />)} />
        <Route path="vendors/:id" element={G('vendors', <VendorDetail />)} />
        <Route path="apply/vendor" element={<VendorApply />} />
        <Route path="sourcing" element={G('sourcing', <Trips />)} />
        <Route path="sourcing/trips/:id" element={G('sourcing', <TripDetail />)} />
        <Route path="sourcing/quotes" element={G('sourcing', <Quotes />)} />
        <Route path="sourcing/compare" element={G('sourcing', <Compare />)} />
        <Route path="sourcing/samples" element={G('sourcing', <Samples />)} />
        <Route path="accord" element={G('accord', <Projects />)} />
        <Route path="accord/residences" element={G('accord', <Residences />)} />
        <Route path="accord/:id" element={G('accord', <ProjectDetail />)} />
        <Route path="admin" element={G('admin', <AdminSettings />)} />
        <Route path="admin/users" element={G('admin', <AdminUsers />)} />
        <Route path="admin/data" element={G('admin', <AdminData />)} />
        <Route path="admin/cleanup" element={G('admin', <DataCleanup />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
