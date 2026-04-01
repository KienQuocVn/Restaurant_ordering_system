const {
  CORS_ORIGIN,
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_SAMESITE,
  SESSION_COOKIE_SECURE,
} = require('../config')

function getAllowedOrigin(req) {
  return req?.headers?.origin || CORS_ORIGIN
}

function sendJson(res, statusCode, payload, extraHeaders = {}, req = null) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders,
  })
  res.end(JSON.stringify(payload))
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' })
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function parseCookies(req) {
  const raw = req?.headers?.cookie || ''
  return raw.split(';').reduce((acc, pair) => {
    const [key, ...rest] = pair.trim().split('=')
    if (!key) return acc
    acc[key] = decodeURIComponent(rest.join('=') || '')
    return acc
  }, {})
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${value}`]
  if (options.maxAge !== undefined) segments.push(`Max-Age=${options.maxAge}`)
  if (options.path) segments.push(`Path=${options.path}`)
  if (options.domain) segments.push(`Domain=${options.domain}`)
  if (options.httpOnly) segments.push('HttpOnly')
  if (options.secure) segments.push('Secure')
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`)
  return segments.join('; ')
}

function createSessionCookie(name, value, maxAge, httpOnly = true) {
  return serializeCookie(name, value, {
    path: '/',
    maxAge,
    httpOnly,
    secure: SESSION_COOKIE_SECURE,
    sameSite: SESSION_COOKIE_SAMESITE,
    domain: SESSION_COOKIE_DOMAIN || undefined,
  })
}

function clearAuthCookies() {
  return [
    createSessionCookie('qr_access_token', '', 0, true),
    createSessionCookie('qr_refresh_token', '', 0, true),
  ]
}

module.exports = {
  sendJson,
  notFound,
  parseBody,
  parseCookies,
  serializeCookie,
  createSessionCookie,
  clearAuthCookies,
}
