import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout, Loading } from '@/components/Layout'
import { useAuth } from '@/lib/auth'
import { Admins } from '@/pages/Admins'
import { AiChecks } from '@/pages/AiChecks'
import { Audit } from '@/pages/Audit'
import { Config } from '@/pages/Config'
import { Dashboard } from '@/pages/Dashboard'
import { Electricians } from '@/pages/Electricians'
import { Legal } from '@/pages/Legal'
import { LessonEditor } from '@/pages/LessonEditor'
import { Lessons } from '@/pages/Lessons'
import { Login } from '@/pages/Login'
import { Materials } from '@/pages/Materials'
import { Reports } from '@/pages/Reports'
import { Reviews } from '@/pages/Reviews'
import { Users } from '@/pages/Users'

export default function App() {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <Loading />
  // The UI gate is a convenience; the database (RLS + ew_admins) is what actually protects the data.
  if (!session || !isAdmin) return <Login />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="lessons/:id" element={<LessonEditor />} />
          <Route path="materials" element={<Materials />} />
          <Route path="config" element={<Config />} />
          <Route path="electricians" element={<Electricians />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ai" element={<AiChecks />} />
          <Route path="legal" element={<Legal />} />
          <Route path="audit" element={<Audit />} />
          <Route path="admins" element={<Admins />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
