const path = require('path')

const PORT = process.env.PORT || 4000
const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'store.db')
const JWT_SECRET = process.env.JWT_SECRET || 'qr-ordering-dev-secret'
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 8)

module.exports = {
  PORT,
  DATA_DIR,
  DATA_FILE,
  DB_FILE,
  JWT_SECRET,
  JWT_EXPIRES_IN_SECONDS,
}
