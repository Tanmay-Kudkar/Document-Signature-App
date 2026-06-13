import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL Database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        await pool.query(schema);
        
        // Ensure file_data column exists (Migration)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_data') THEN
                    ALTER TABLE documents ADD COLUMN file_data BYTEA;
                    ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;
                END IF;
                
                -- Ensure type and metadata columns exist in signatures table
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='type') THEN
                    ALTER TABLE signatures ADD COLUMN type VARCHAR(50) DEFAULT 'signature';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='metadata') THEN
                    ALTER TABLE signatures ADD COLUMN metadata JSONB;
                END IF;
            END $$;
        `);
        
        console.log('Database tables initialized from schema.sql');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};
