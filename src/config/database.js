import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const Node_ENV = process.env.NODE_ENV;
// Get the appropriate database URL based on the environment
const getDatabaseUrl = () => {
    if (Node_ENV === 'production') {
        return process.env.DATABASE_URL_production;
    }
    return process.env.DATABASE_URL_development;
};

const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: false // Disable SSL for local development
});

// Test database connection
const testConnection = async () => {
    try {
        console.log('Attempting to connect to database...');
        console.log('Connection URL:', getDatabaseUrl());
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL database');
        
        // Test query to verify full connectivity
        const result = await client.query('SELECT version()');
        console.log('PostgreSQL version:', result.rows[0].version);
        
        client.release();
    } catch (err) {
        console.error('Error connecting to the database:', {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        // Rethrow the error to be handled by the caller
        throw err;
    }
};

testConnection();

export default pool;
