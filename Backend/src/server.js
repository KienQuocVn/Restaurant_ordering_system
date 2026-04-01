const http = require('http')
const { URL } = require('url')
const { PORT } = require('./config')
const { sendJson } = require('./utils/http')
const { routeRequest } = require('./routes')

function startServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true })
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)

    try {
      await routeRequest(req, res, url)
    } catch (error) {
      console.error(error)
      sendJson(res, 500, { error: 'Internal server error' })
    }
  })

  server.listen(PORT, () => {
    console.log(`QR backend listening on http://localhost:${PORT}`)
  })
}

module.exports = {
  startServer,
}
