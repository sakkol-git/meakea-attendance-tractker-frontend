// Isolated production instances prove both runtime modes without development-server reloads.
import { spawn } from 'node:child_process'
const remote = process.argv[2] === 'remote'
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: remote ? '3101' : '3100',
    NUXT_PUBLIC_DATA_SOURCE: remote ? 'remote' : 'local',
    NUXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3101/api/v1',
  },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
server.on('exit', (code) => process.exit(code ?? 1))
