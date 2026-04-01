const { CORS_ORIGIN } = require('./config')

const clients = new Set()

function sendEvent(client, event, payload) {
  client.res.write(`event: ${event}\n`)
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function subscribe(req, res, context = {}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': req.headers.origin || CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.write(': connected\n\n')

  const client = {
    res,
    restaurantId: context.restaurantId || null,
    role: context.role || 'public',
    userId: context.userId || null,
  }

  clients.add(client)

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(client)
  })
}

function publish(event, payload, filter = () => true) {
  for (const client of clients) {
    if (!filter(client)) continue
    sendEvent(client, event, payload)
  }
}

function publishRestaurantEvent(restaurantId, event, payload, roles = []) {
  publish(
    event,
    payload,
    (client) =>
      client.restaurantId === restaurantId &&
      (roles.length === 0 || roles.includes(client.role))
  )
}

module.exports = {
  subscribe,
  publish,
  publishRestaurantEvent,
}
