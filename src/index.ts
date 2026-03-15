import './env'
import { logger } from './logger'
import { App } from './app'

async function main() {
  logger.info('Starting Minetrack...')

  const app = new App()
  await app.init()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
