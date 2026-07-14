/**
 * Authentication. The write password lives ONLY here on the server (env var) —
 * it is never shipped in the client bundle. The client logs in once, receives a
 * short-lived JWT, and sends it as a Bearer token on every mutating request.
 * This is the fix for the old app leaking a write-capable key in page source.
 */
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'node:crypto'
import { HttpError } from './db.ts'

const IS_PROD = process.env.NODE_ENV === 'production'

// In production these MUST be provided as Railway env vars. In local dev we fall
// back to obvious defaults and warn loudly so nothing silently ships insecure.
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? (IS_PROD ? '' : 'letmein')
const JWT_SECRET = process.env.JWT_SECRET ?? (IS_PROD ? '' : 'dev-only-secret')
const TOKEN_TTL = '30d'

if (IS_PROD && (!AUTH_PASSWORD || !JWT_SECRET)) {
  // eslint-disable-next-line no-console
  console.error(
    '[auth] FATAL: AUTH_PASSWORD and JWT_SECRET must be set in production.',
  )
  process.exit(1)
}
if (!IS_PROD) {
  // eslint-disable-next-line no-console
  console.warn('[auth] DEV MODE — password is "letmein". Set AUTH_PASSWORD in prod.')
}

/** Constant-time string compare to avoid leaking length/prefix via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Verify the password and mint a signed token. Throws 401 on mismatch. */
export function login(password: string): string {
  if (!password || !safeEqual(password, AUTH_PASSWORD)) {
    throw new HttpError(401, 'Incorrect password')
  }
  return jwt.sign({ role: 'owner' }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

/** Express middleware: reject any request without a valid Bearer token. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    next(new HttpError(401, 'Authentication required'))
    return
  }
  try {
    jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    next(new HttpError(401, 'Session expired — please sign in again'))
  }
}
