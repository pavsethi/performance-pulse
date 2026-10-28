import 'dotenv/config'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleReview, statusBody } from './server/reviewHandler'

/**
 * Runs the Narrative Writer inside the dev server so the API key stays in
 * .env on this machine and never ends up in the client bundle.
 */
const reviewApi = (): Plugin => ({
  name: 'pulse-review-api',
  configureServer(server) {
    server.middlewares.use('/api/review/status', (_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(statusBody())
    })
    server.middlewares.use('/api/review', (req, res, next) => {
      if (req.method !== 'POST') return next()
      void handleReview(req, res)
    })
  },
})

export default defineConfig({
  plugins: [react(), reviewApi()],
  server: { port: 5173 },
})
