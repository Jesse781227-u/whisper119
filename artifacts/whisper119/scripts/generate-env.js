#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const envFile = path.resolve(__dirname, '..', '.env')

const keys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

function readFromProcessEnv() {
  const result = {}
  for (const k of keys) {
    if (process.env[k]) result[k] = process.env[k]
  }
  return result
}

async function promptMissing(existing) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())))
  const out = { ...existing }
  for (const k of keys) {
    if (!out[k]) {
      const val = await ask(`${k} (leave blank to skip): `)
      if (val) out[k] = val
    }
  }
  rl.close()
  return out
}

function writeEnvFile(map) {
  const lines = keys.map((k) => `${k}=${map[k] ?? ''}`)
  fs.writeFileSync(envFile, lines.join('\n') + '\n', { encoding: 'utf8', flag: 'w' })
  console.log('Wrote .env to', envFile)
  console.log('Reminder: do NOT commit this file. It contains secrets.')
}

async function main() {
  const existing = readFromProcessEnv()
  const missing = keys.filter((k) => !existing[k])
  let finalMap = existing
  if (missing.length > 0) {
    console.log('Some VITE_FIREBASE_* values are missing from the environment. You can enter them interactively now.')
    finalMap = await promptMissing(existing)
  }

  const stillMissing = keys.filter((k) => !finalMap[k])
  if (stillMissing.length > 0) {
    console.warn('Warning: the following keys are still missing and will be written empty:', stillMissing.join(', '))
  }

  writeEnvFile(finalMap)
}

main().catch((err) => { console.error(err); process.exitCode = 1 })
