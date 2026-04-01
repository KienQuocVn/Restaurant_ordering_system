const { startServer } = require('./src/server')

startServer().catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
