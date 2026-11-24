import { t } from '@/lib/i18n'

export class ClientApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code)
  }
}

export function errorText(code: string | undefined): string {
  return (code ? t.errors[code] : undefined) ?? t.errors.internal ?? ''
}

/** JSON so'rov. Xatoda ClientApiError (code = serverdagi xato kodi) tashlaydi. */
export async function apiJson<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers:
        init?.json !== undefined
          ? { 'Content-Type': 'application/json', ...init.headers }
          : init?.headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    })
  } catch {
    throw new ClientApiError('network', 0)
  }
  const data = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
  } | null
  if (!res.ok) {
    const code = data?.error?.code ?? 'internal'
    // `validation` xatosida server aniq sababni message'da qaytaradi (masalan 'short')
    throw Object.assign(new ClientApiError(code, res.status), { detail: data?.error?.message })
  }
  return data as T
}
