import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { drawStake } from './server/draw.ts'

function drawApi(env: Record<string, string>): Plugin {
  const options = {
    apiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    model: env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || undefined,
  }

  const handle: Connect.NextHandleFunction = async (req, res, next) => {
    if (req.method !== 'POST') {
      next()
      return
    }
    try {
      const result = await drawStake(await readBody(req), options)
      sendJson(res, 200, result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draw failed'
      sendJson(res, 400, { error: message })
    }
  }

  return {
    name: 'draw-api',
    configureServer(server) {
      server.middlewares.use('/api/draw', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/draw', handle)
    },
  }
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 20_000) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), drawApi(env)],
  }
})
