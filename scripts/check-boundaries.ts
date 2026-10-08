import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

function main() {
  try {
    const ownershipPath = path.resolve(process.cwd(), '.opencode', 'ownership.json')
    if (!fs.existsSync(ownershipPath)) {
      console.warn('⚠️ No ownership.json found. Skipping boundary check.')
      return
    }

    const ownership = JSON.parse(fs.readFileSync(ownershipPath, 'utf8'))
    const commitMsg = execSync('git log -1 --pretty=%B').toString().trim()
    const diffFiles = execSync('git diff --name-only HEAD~1 HEAD')
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)

    const match = commitMsg.match(/^(\w+)\(([^)]+)\):/)
    if (!match) {
      console.warn('⚠️ No agent scope recognized in commit message. Letting pass with a warning.')
      return
    }

    const agent = match[2]
    const allowedPaths = ownership[agent]

    if (!allowedPaths) {
      console.error(`❌ Agent '${agent}' not found in ownership.json.`)
      process.exit(1)
    }

    let hasViolations = false
    for (const file of diffFiles) {
      const isAllowed = allowedPaths.some(
        (allowedPath: string) => file.startsWith(allowedPath) || file === allowedPath,
      )
      if (!isAllowed) {
        console.error(
          `❌ Boundary violation: Agent '${agent}' modified '${file}' which is not in its allowed paths.`,
        )
        hasViolations = true
      }
    }

    if (hasViolations) {
      process.exit(1)
    }

    console.log('✅ Boundary check passed.')
  } catch (error) {
    console.error('Failed to run check-boundaries:', error)
    process.exit(1)
  }
}

main()
