import { config } from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

async function testDatabaseConnection() {
  try {
    // Log environment variables (without sensitive data)
    console.log('Environment variables loaded:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '***' : 'undefined'}`);
    
    // Check if required environment variables are set
    if (!process.env.DATABASE_URL) {
      console.error('Missing DATABASE_URL environment variable');
      return false;
    }

    console.log('Testing database connection...');
    
    // Create a new client
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Connect to the database
    await client.connect();
    
    // Execute a simple query
    const result = await client.query('SELECT current_database(), current_user, version()');
    
    console.log('Connection successful!');
    console.log('Database information:');
    console.log(`- Database: ${result.rows[0].current_database}`);
    console.log(`- User: ${result.rows[0].current_user}`);
    console.log(`- Version: ${result.rows[0].version}`);
    
    // Close the connection
    await client.end();
    
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
}

// Run the test
testDatabaseConnection(); 