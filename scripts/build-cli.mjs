// Compiles the command line client into a single executable with Bun:
//   bun scripts/build-cli.mjs        -> dist/filepizza (dist/filepizza.exe on Windows)
//
// The executable is built for the machine it is built on, because the WebRTC
// library (node-datachannel) ships one native addon per platform.
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)

// node-datachannel loads its native addon with a computed name, which a
// bundler can't follow. Find the addon that is installed for this platform...
const entry = require.resolve('node-datachannel')
const packageRoot = entry.slice(
  0,
  entry.lastIndexOf('node-datachannel') + 'node-datachannel'.length,
)
const addonsDir = join(packageRoot, '..', '@node-datachannel')
const addon = readdirSync(addonsDir).find((name) =>
  name.startsWith(`${process.platform}-${process.arch}`),
)
if (!addon) {
  throw new Error(
    `No node-datachannel addon is installed for ${process.platform}-${process.arch} in ${addonsDir}.`,
  )
}
const addonFile = join(addonsDir, addon, 'node_datachannel.node')

// ...and have the bundler load exactly that file, so it ends up inside the
// executable.
const embedAddon = {
  name: 'embed-node-datachannel-addon',
  setup(build) {
    build.onLoad(
      { filter: /node-datachannel\.(cjs|mjs)$/ },
      async ({ path }) => {
        const source = await Bun.file(path).text()
        const dynamicRequire = 'return require(pkgName);'
        if (!source.includes(dynamicRequire)) {
          throw new Error(`Unexpected node-datachannel loader in ${path}`)
        }
        const esm = path.endsWith('.mjs')
        return {
          loader: 'js',
          contents: esm
            ? `import __addon from ${JSON.stringify(addonFile)};\n${source.replace(dynamicRequire, 'return __addon;')}`
            : source.replace(
                dynamicRequire,
                `return require(${JSON.stringify(addonFile)});`,
              ),
        }
      },
    )
  },
}

const outfile = join(
  'dist',
  process.platform === 'win32' ? 'filepizza.exe' : 'filepizza',
)
const result = await Bun.build({
  entrypoints: ['cli/main.ts'],
  compile: { outfile },
  plugins: [embedAddon],
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
console.log(`Built ${outfile}`)
