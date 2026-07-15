import { build } from 'esbuild'

// Load environment variables from process.env
const configStoreNamePrefix = process.env.STORE_NAME_PREFIX || 'Fingerprint_Compute'

build({
  entryPoints: ['./src/index.ts'],
  outdir: './build',
  bundle: true,
  format: 'esm',
  external: ['fastly:*'],
  define: { 'process.env.STORE_NAME_PREFIX': `"${configStoreNamePrefix}"` },
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
