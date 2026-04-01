const http = require('http')
const { URL } = require('url')
const { PORT } = require('./config')
const { sendJson } = require('./utils/http')
const { routeRequest } = require('./routes')
const { initStore } = require('./data/store')

async function startServer() {
  await initStore()

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true }, {}, req)
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)

    try {
      await routeRequest(req, res, url)
    } catch (error) {
      console.error(error)
      sendJson(res, 500, { error: 'Internal server error' }, {}, req)
    }
  })

  server.listen(PORT, () => {
    console.log(`QR backend listening on http://localhost:${PORT}`)
  })
}

module.exports = {
  startServer,
}
