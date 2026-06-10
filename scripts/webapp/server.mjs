#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { injectEditToolbar } from '../editable-inject.mjs'
import { approveOutline, createRun, getRunStatus } from './handlers.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PORT = Number(process.env.PPTMASTER_PORT || 8780)
const children = new Map()

function runDirFor(slug) {
  return path.join(REPO_ROOT, 'outputs', `${slug}-fullcase`)
}

function spawnStage(slug, extraArgs = []) {
  if (children.has(slug)) return { alreadyRunning: true }
  const runDir = runDirFor(slug)
  fs.mkdirSync(runDir, { recursive: true })
  fs.rmSync(path.join(runDir, 'generation-error.txt'), { force: true })
  const args = [
    '-r',
    'dotenv/config',
    path.join(REPO_ROOT, 'scripts/gen-fullcase-cli.mjs'),
    slug,
    `--output=${runDir}`,
    '--research-rounds=2',
    '--outline-attempts=2',
    '--max-pages-per-chapter-call=2',
    ...extraArgs,
  ]
  const child = spawn('node', args, { cwd: REPO_ROOT, env: process.env })
  const log = fs.createWriteStream(path.join(runDir, 'webapp-stage.log'), { flags: 'a' })
  child.stdout.pipe(log)
  child.stderr.pipe(log)
  child.on('exit', code => {
    if (code !== 0) {
      fs.writeFileSync(path.join(runDir, 'generation-error.txt'), `stage exited ${code}, see webapp-stage.log`)
    }
    children.delete(slug)
  })
  children.set(slug, child)
  return { alreadyRunning: false }
}

async function readBody(request) {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

function send(response, status, payload, type = 'application/json') {
  response.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'no-store',
  })
  response.end(type === 'application/json' ? JSON.stringify(payload) : payload)
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${PORT}`)
    const parts = url.pathname.split('/').filter(Boolean)

    if (request.method === 'GET' && url.pathname === '/') {
      return send(response, 200, fs.readFileSync(path.join(REPO_ROOT, 'scripts/webapp/index.html'), 'utf8'), 'text/html')
    }
    if (request.method === 'POST' && url.pathname === '/api/runs') {
      const payload = await readBody(request)
      const { slug } = createRun({ root: REPO_ROOT, payload })
      spawnStage(slug, ['--outline-only'])
      return send(response, 200, { slug })
    }
    if (parts[0] === 'api' && parts[1] === 'runs' && parts[2]) {
      const slug = parts[2]
      if (request.method === 'GET' && parts[3] === 'status') {
        const status = getRunStatus({ root: REPO_ROOT, slug })
        return send(response, 200, { ...status, running: children.has(slug) })
      }
      if (request.method === 'POST' && parts[3] === 'approve-outline') {
        const { notes } = await readBody(request)
        approveOutline({ root: REPO_ROOT, slug, notes })
        spawnStage(slug, ['--critic'])
        return send(response, 200, { ok: true })
      }
      if (request.method === 'GET' && parts[3] === 'deck') {
        const deckPath = path.join(runDirFor(slug), 'deck.freeform.html')
        if (!fs.existsSync(deckPath)) return send(response, 404, { error: 'deck not ready' })
        return send(response, 200, injectEditToolbar(fs.readFileSync(deckPath, 'utf8')), 'text/html')
      }
    }
    return send(response, 404, { error: `not found: ${url.pathname}` })
  } catch (error) {
    return send(response, 500, { error: String(error?.message || error) })
  }
})

server.listen(PORT, () => {
  console.log(`PPTMaster webapp: http://localhost:${PORT}`)
})
