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
    console.error('Unexpected error on idle client:', err.message || err);
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
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='signing_mode') THEN
                    ALTER TABLE documents ADD COLUMN signing_mode VARCHAR(50) DEFAULT 'only_me';
                END IF;
                
                -- Ensure type and metadata columns exist in signatures table
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='type') THEN
                    ALTER TABLE signatures ADD COLUMN type VARCHAR(50) DEFAULT 'signature';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='metadata') THEN
                    ALTER TABLE signatures ADD COLUMN metadata JSONB;
                END IF;

                -- Create user_preferences table for persisted sig config + field colors
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_preferences') THEN
                    CREATE TABLE user_preferences (
                        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                        sig_config  JSONB,
                        field_colors JSONB,
                        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                END IF;

                -- Several People Mode Settings
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='signing_order_enabled') THEN
                    ALTER TABLE documents ADD COLUMN signing_order_enabled BOOLEAN DEFAULT false;
                    ALTER TABLE documents ADD COLUMN expiration_days INTEGER DEFAULT 15;
                    ALTER TABLE documents ADD COLUMN reminders_enabled BOOLEAN DEFAULT true;
                    ALTER TABLE documents ADD COLUMN reminder_days INTEGER DEFAULT 1;
                    ALTER TABLE documents ADD COLUMN language VARCHAR(50) DEFAULT 'English';
                    ALTER TABLE documents ADD COLUMN customize_email BOOLEAN DEFAULT false;
                    ALTER TABLE documents ADD COLUMN uuid_enabled BOOLEAN DEFAULT true;
                    ALTER TABLE documents ADD COLUMN verification_code_enabled BOOLEAN DEFAULT true;
                END IF;

                -- Create document_receivers table
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='document_receivers') THEN
                    CREATE TABLE document_receivers (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) NOT NULL,
                        role VARCHAR(50) NOT NULL DEFAULT 'Signer',
                        auth_password VARCHAR(255),
                        auth_phone VARCHAR(50),
                        auth_format VARCHAR(100),
                        display_order INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                END IF;

                -- Migrate audit_logs IP column type and add new tracking fields
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address' AND data_type='inet') THEN
                    ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(255) USING ip_address::VARCHAR(255);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='request_id') THEN
                    ALTER TABLE audit_logs ADD COLUMN request_id UUID;
                    ALTER TABLE audit_logs ADD COLUMN session_id TEXT;
                    ALTER TABLE audit_logs ADD COLUMN country TEXT;
                    ALTER TABLE audit_logs ADD COLUMN city TEXT;
                    ALTER TABLE audit_logs ADD COLUMN device_type TEXT;
                END IF;

                -- Ensure audit_logs indexes exist
                CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_logs(actor_id);
                CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
            END $$;
        `);
        
        console.log('Database tables initialized from schema.sql');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};
