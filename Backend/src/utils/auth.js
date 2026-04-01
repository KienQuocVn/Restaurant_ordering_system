const crypto = require('crypto')
const {
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_TTL_SECONDS,
  REALTIME_TOKEN_TTL_SECONDS,
} = require('../config')
const { parseCookies } = require('./http')

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  )
  return Buffer.from(padded, 'base64').toString('utf8')
}

function signToken(payload, secret, expiresInSeconds) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(tokenPayload))
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

function verifyToken(token, secret) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  if (signature !== expectedSignature) return null

  const payload = JSON.parse(fromBase64Url(encodedPayload))
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) return null
  return payload
}

function signAccessToken(payload) {
  return signToken(payload, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL_SECONDS)
}

function signRealtimeToken(payload) {
  return signToken(payload, ACCESS_TOKEN_SECRET, REALTIME_TOKEN_TTL_SECONDS)
}

function signRefreshJwt(payload) {
  return signToken(payload, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL_SECONDS)
}

function verifyJwt(token) {
  return verifyToken(token, ACCESS_TOKEN_SECRET)
}

function verifyRefreshJwt(token) {
  return verifyToken(token, REFRESH_TOKEN_SECRET)
}

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim()
  }
  const cookies = parseCookies(req)
  return cookies.qr_access_token || null
}

function getRefreshToken(req) {
  const cookies = parseCookies(req)
  return cookies.qr_refresh_token || null
}

module.exports = {
  signAccessToken,
  signRealtimeToken,
  signRefreshJwt,
  verifyJwt,
  verifyRefreshJwt,
  createOpaqueToken,
  hashToken,
  getBearerToken,
  getRefreshToken,
}
