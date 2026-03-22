/**
 * Database Initialization Script
 * Run this to set up all tables in your Neon PostgreSQL database
 * Usage: npx tsx src/db/init.ts
 */

import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

// Parse SQL statements properly, handling dollar-quoted strings
function parseSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarQuoteTag = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    // Check for dollar quote start/end
    if (char === '$') {
      if (!inDollarQuote) {
        // Look for $tag$ pattern
        const match = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
        if (match) {
          inDollarQuote = true;
          dollarQuoteTag = match[1];
          current += match[0];
          i += match[0].length;
          continue;
        }
      } else {
        // Check for closing $tag$
        const closingPattern = new RegExp(`^\\\$${dollarQuoteTag}\\\$`);
        const match = sql.slice(i).match(closingPattern);
        if (match) {
          inDollarQuote = false;
          dollarQuoteTag = '';
          current += match[0];
          i += match[0].length;
          continue;
        }
      }
    }
    
    // Only split on semicolons outside dollar-quoted strings
    if (char === ';' && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed + ';');
      }
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Add final statement if exists
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  return statements.filter(s => s.length > 0);
}

async function initializeDatabase() {
  console.log('Connecting to Neon PostgreSQL...');
  
  const sql: NeonQueryFunction<false, false> = neon(DATABASE_URL);
  
  try {
    // Test connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Connected successfully! Server time:', result[0].current_time);
    
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    console.log('\nExecuting schema...');
    
    const statements = parseSQLStatements(schema);
    console.log(`Found ${statements.length} statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const firstLine = statement.split('\n')[0].trim();
      try {
        // Use sql() as a tagged template function
        await sql(statement as any);
        successCount++;
        process.stdout.write('.');
      } catch (err: any) {
        // Ignore "already exists" errors
        if (err.message && (err.message.includes('already exists') || err.message.includes('Duplicate'))) {
          skipCount++;
          process.stdout.write('o');
        } else if (err.message && err.message.includes('does not exist')) {
          // These are expected for indexes/triggers on tables not yet created
          errorCount++;
          process.stdout.write('-');
        } else {
          errorCount++;
          process.stdout.write('x');
          console.error(`\n[Statement ${i + 1}] ${firstLine.substring(0, 60)}...`);
          console.error(`  Error: ${err.message}`);
        }
      }
    }
    
    console.log(`\n\nResults: ${successCount} created, ${skipCount} skipped (already exists), ${errorCount} errors`);
    
    // Verify tables were created
    console.log('\nVerifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\nCreated tables:');
    if (tables.length === 0) {
      console.log('  (none found)');
    } else {
      tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`));
    }
    
    console.log('\nDatabase initialization complete!');
    
  } catch (error: any) {
    console.error('\nDatabase initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
