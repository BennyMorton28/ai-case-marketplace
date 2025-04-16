import { config } from 'dotenv';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

async function quickDbTest() {
  console.log('Starting quick database test...');
  const dbUrl = process.env.DATABASE_URL;
  console.log(`Database URL: postgresql://postgres:***@${dbUrl?.split('@')[1] || 'unknown'}`);
  
  // Create a client with a longer connection timeout and explicit port
  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 30000, // 30 seconds timeout
    port: 5432,
    ssl: {
      rejectUnauthorized: false // Try without SSL verification
    }
  });
  
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('Connection successful!');
    
    // Execute a simple query
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('Query result:');
    console.log(`- Database: ${result.rows[0].current_database}`);
    console.log(`- User: ${result.rows[0].current_user}`);
    console.log(`- Version: ${result.rows[0].version}`);
    
    // Close the connection
    await client.end();
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return false;
  }
}

// Run the test
quickDbTest(); 