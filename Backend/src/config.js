const path = require('path')

const PORT = process.env.PORT || 4000
const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

module.exports = {
  PORT,
  DATA_DIR,
  DATA_FILE,
}
