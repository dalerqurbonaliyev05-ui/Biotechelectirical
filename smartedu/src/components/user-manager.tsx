'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

export interface UserRow {
  id: string
  full_name: string
  student_code: string | null
  email: string | null
  group_id: string | null
  department_id: string | null
  is_active: boolean
  assignments: { subject_id: string; group_id: string }[]
}
interface Opt {
  value: string
  label: string
}

const U = t.admin.users

/** O'qituvchi va talabalar ro'yxati + yaratish/tahrirlash/parol tiklash (admin). */
export function UserManager({
  role,
  rows,
  groups,
  subjects,
  departments,
  selfId,
}: {
  role: 'teacher' | 'student'
  rows: UserRow[]
  groups: Opt[]
  subjects: Opt[]
  departments: Opt[]
  selfId: string
}) {
  const router = useRouter()
  const [form, setForm] = useState<UserRow | 'new' | null>(null)
  const [v, setV] = useState({
    full_name: '',
    code: '',
    email: '',
    group_id: '',
    department_id: '',
  })
  const [assignments, setAssignments] = useState<{ subject_id: string; group_id: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const groupName = (id: string | null) => groups.find((g) => g.value === id)?.label ?? '—'

  function open(row: UserRow | 'new') {
    setError(null)
    setForm(row)
    if (row === 'new') {
      setV({ full_name: '', code: '', email: '', group_id: '', department_id: '' })
      setAssignments([])
    } else {
      setV({
        full_name: row.full_name,
        code: row.student_code ?? '',
        email: row.email ?? '',
        group_id: row.group_id ?? '',
        department_id: row.department_id ?? '',
      })
      setAssignments(row.assignments)
    }
  }

  function fail(err: unknown) {
    if (err instanceof ClientApiError && err.code === 'duplicate')
      return setError(U.errors.duplicate ?? '')
    setError(errorText(err instanceof ClientApiError ? err.code : undefined))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const cleanAssignments = assignments.filter((a) => a.subject_id && a.group_id)
    try {
      if (form === 'new') {
        const json =
          role === 'student'
            ? { role, full_name: v.full_name, student_code: v.code, group_id: v.group_id }
            : {
                role,
                full_name: v.full_name,
                email: v.email,
                department_id: v.department_id || null,
                assignments: cleanAssignments,
              }
        const res = await apiJson<{ temp_password: string }>('/api/admin/users', {
          method: 'POST',
          json,
        })
        setTemp({ name: v.full_name, password: res.temp_password })
      } else if (form) {
        await apiJson(`/api/admin/users/${form.id}`, {
          method: 'PATCH',
          json: {
            full_name: v.full_name,
            ...(role === 'student'
              ? { group_id: v.group_id || null }
              : { department_id: v.department_id || null }),
          },
        })
        if (role === 'teacher') {
          await apiJson(`/api/admin/users/${form.id}/assignments`, {
            method: 'PUT',
            json: { assignments: cleanAssignments },
          })
        }
      }
      setForm(null)
      router.refresh()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(row: UserRow) {
    if (!confirm(U.confirmReset)) return
    try {
      const res = await apiJson<{ temp_password: string }>(
        `/api/admin/users/${row.id}/reset-password`,
        { method: 'POST' },
      )
      setTemp({ name: row.full_name, password: res.temp_password })
    } catch (err) {
      fail(err)
    }
  }

  async function toggleActive(row: UserRow) {
    try {
      await apiJson(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        json: { is_active: !row.is_active },
      })
      router.refresh()
    } catch (err) {
      fail(err)
    }
  }

  async function remove(row: UserRow) {
    if (!confirm(U.confirmDelete)) return
    try {
      await apiJson(`/api/admin/users/${row.id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      fail(err)
    }
  }

  const sel = (value: string, onChange: (x: string) => void, opts: Opt[], id: string) => (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t.admin.crud.choose}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {role === 'student' ? U.studentsTitle : U.teachersTitle}
        </h1>
        <button className="btn-primary" onClick={() => open('new')}>
          + {role === 'student' ? U.addStudent : U.addTeacher}
        </button>
      </div>

      {temp && (
        <div role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <b>{temp.name}</b> — {U.tempPassword}{' '}
          <code className="rounded bg-white px-2 py-1 text-base font-bold select-all">
            {temp.password}
          </code>
          <button className="ml-3 underline" onClick={() => setTemp(null)}>
            ✕
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {form && (
        <form onSubmit={save} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="u-name">
                {U.fullName} *
              </label>
              <input
                id="u-name"
                className="input"
                value={v.full_name}
                onChange={(e) => setV({ ...v, full_name: e.target.value })}
                required
                minLength={3}
              />
            </div>
            {role === 'student' ? (
              <>
                <div>
                  <label className="label" htmlFor="u-code">
                    {U.code} *
                  </label>
                  <input
                    id="u-code"
                    className="input"
                    value={v.code}
                    disabled={form !== 'new'}
                    onChange={(e) => setV({ ...v, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="u-group">
                    {U.group} *
                  </label>
                  {sel(v.group_id, (x) => setV({ ...v, group_id: x }), groups, 'u-group')}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="u-email">
                    {U.email} *
                  </label>
                  <input
                    id="u-email"
                    type="email"
                    className="input"
                    value={v.email}
                    disabled={form !== 'new'}
                    onChange={(e) => setV({ ...v, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="u-dep">
                    {U.department}
                  </label>
                  {sel(
                    v.department_id,
                    (x) => setV({ ...v, department_id: x }),
                    departments,
                    'u-dep',
                  )}
                </div>
              </>
            )}
          </div>

          {role === 'teacher' && (
            <div className="space-y-2">
              <p className="label">{U.assignments}</p>
              {assignments.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  {sel(
                    a.subject_id,
                    (x) =>
                      setAssignments(
                        assignments.map((r, j) => (j === i ? { ...r, subject_id: x } : r)),
                      ),
                    subjects,
                    `as-s-${i}`,
                  )}
                  {sel(
                    a.group_id,
                    (x) =>
                      setAssignments(
                        assignments.map((r, j) => (j === i ? { ...r, group_id: x } : r)),
                      ),
                    groups,
                    `as-g-${i}`,
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    aria-label={t.app.delete}
                    onClick={() => setAssignments(assignments.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignments([...assignments, { subject_id: '', group_id: '' }])}
              >
                {U.addAssignment}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy}>
              {t.app.save}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
              {t.app.cancel}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="card text-slate-500">{t.app.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{role === 'student' ? U.code : U.email}</th>
                <th>{U.fullName}</th>
                <th>{role === 'student' ? U.group : U.assignments}</th>
                <th>{U.status}</th>
                <th>{t.app.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.is_active ? '' : 'text-slate-400'}>
                  <td className="font-mono text-xs">
                    {role === 'student' ? r.student_code : r.email}
                  </td>
                  <td>{r.full_name}</td>
                  <td>
                    {role === 'student'
                      ? groupName(r.group_id)
                      : r.assignments.length === 0
                        ? '—'
                        : r.assignments
                            .map(
                              (a) =>
                                `${subjects.find((s) => s.value === a.subject_id)?.label ?? '?'} (${groupName(a.group_id)})`,
                            )
                            .join(', ')}
                  </td>
                  <td>
                    <span className="badge">{r.is_active ? U.active : U.inactive}</span>
                  </td>
                  <td className="space-x-3 whitespace-nowrap">
                    <button className="text-brand-600 hover:underline" onClick={() => open(r)}>
                      {t.app.edit}
                    </button>
                    <button
                      className="text-brand-600 hover:underline"
                      onClick={() => resetPassword(r)}
                    >
                      {U.resetPassword}
                    </button>
                    {r.id !== selfId && (
                      <>
                        <button
                          className="text-slate-600 hover:underline"
                          onClick={() => toggleActive(r)}
                        >
                          {r.is_active ? U.deactivate : U.activate}
                        </button>
                        <button className="text-red-600 hover:underline" onClick={() => remove(r)}>
                          {t.app.delete}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
