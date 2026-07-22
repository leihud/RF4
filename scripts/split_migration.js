import fs from 'fs'
import path from 'path'

const inputFile = path.join(process.cwd(), 'migrations', '0002_insert_data.sql')
const outputDir = path.join(process.cwd(), 'migrations')

const content = fs.readFileSync(inputFile, 'utf-8')
const lines = content.split('\n')

const insertLines = lines.filter(line => line.trim().startsWith('INSERT'))
const batchSize = 50

let batchIndex = 1
for (let i = 0; i < insertLines.length; i += batchSize) {
  const batch = insertLines.slice(i, i + batchSize)
  let output = `-- Migration: Insert batch ${batchIndex}\n\n`
  output += batch.join('\n')
  output += '\n'
  
  const filename = `0002_insert_batch_${batchIndex}.sql`
  fs.writeFileSync(path.join(outputDir, filename), output)
  console.log(`✓ Created: ${filename} (${batch.length} statements)`)
  batchIndex++
}

fs.unlinkSync(inputFile)
console.log(`\n✓ Deleted original file: 0002_insert_data.sql`)
console.log(`✓ Total batches created: ${batchIndex - 1}`)