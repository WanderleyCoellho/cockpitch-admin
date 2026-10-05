import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()

const backendTarget = process.env.OPS_BACKEND_URL || 'http://localhost:3001'
const port = Number(process.env.OPS_BFF_PORT || 4174)

app.use(
    createProxyMiddleware({
        pathFilter: '/api',
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        xfwd: true,
        proxyTimeout: 30_000,
        timeout: 30_000
    })
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../../dist')

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', backendTarget, at: new Date().toISOString() })
})

app.use(express.static(distPath))
app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(port, () => {
    console.log(`[lumen-deal-ops-bff] running on http://localhost:${port}`)
    console.log(`[lumen-deal-ops-bff] proxying /api -> ${backendTarget}`)
})
