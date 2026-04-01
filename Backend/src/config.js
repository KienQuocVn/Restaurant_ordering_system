const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) return
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

const ROOT_DIR = path.join(__dirname, '..')
const envFiles = [
  path.join(ROOT_DIR, '.env'),
  path.join(ROOT_DIR, '.env.local'),
]

envFiles.forEach(loadEnvFile)

const PORT = Number(process.env.PORT || 4000)
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development'
const IS_PROD = APP_ENV === 'production'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'
const DATA_DIR = path.join(ROOT_DIR, 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

const DATABASE_URL = process.env.DATABASE_URL || ''
const PGHOST = process.env.PGHOST || '127.0.0.1'
const PGPORT = Number(process.env.PGPORT || 5432)
const PGDATABASE = process.env.PGDATABASE || 'qr_ordering'
const PGUSER = process.env.PGUSER || 'postgres'
const PGPASSWORD = process.env.PGPASSWORD || 'postgres'
const PGSSL = String(process.env.PGSSL || 'false').toLowerCase() === 'true'

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'qr-ordering-access-dev-secret'
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'qr-ordering-refresh-dev-secret'
const REALTIME_TOKEN_SECRET =
  process.env.REALTIME_TOKEN_SECRET || ACCESS_TOKEN_SECRET

const ACCESS_TOKEN_TTL_SECONDS = Number(
  process.env.ACCESS_TOKEN_TTL_SECONDS || 60 * 15
)
const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 14
)
const REALTIME_TOKEN_TTL_SECONDS = Number(
  process.env.REALTIME_TOKEN_TTL_SECONDS || 60 * 10
)
const SESSION_COOKIE_SECURE = String(
  process.env.SESSION_COOKIE_SECURE || String(IS_PROD)
).toLowerCase() === 'true'
const SESSION_COOKIE_SAMESITE = process.env.SESSION_COOKIE_SAMESITE || 'Lax'
const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || ''
const EXPORT_JSON_SNAPSHOT = String(
  process.env.EXPORT_JSON_SNAPSHOT || 'true'
).toLowerCase() === 'true'

module.exports = {
  PORT,
  APP_ENV,
  IS_PROD,
  CORS_ORIGIN,
  ROOT_DIR,
  DATA_DIR,
  DATA_FILE,
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  PGSSL,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  REALTIME_TOKEN_SECRET,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  REALTIME_TOKEN_TTL_SECONDS,
  SESSION_COOKIE_SECURE,
  SESSION_COOKIE_SAMESITE,
  SESSION_COOKIE_DOMAIN,
  EXPORT_JSON_SNAPSHOT,
}
