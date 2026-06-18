-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users Table: Stores registered users and authentication data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table: Stores metadata and file data for uploaded PDFs
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_data BYTEA,
    file_path VARCHAR(255),
    original_name VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'uploaded',
    signing_mode VARCHAR(50) DEFAULT 'only_me',
    
    -- Settings for Several People Mode
    signing_order_enabled BOOLEAN DEFAULT false,
    expiration_days INTEGER DEFAULT 15,
    reminders_enabled BOOLEAN DEFAULT true,
    reminder_days INTEGER DEFAULT 1,
    language VARCHAR(50) DEFAULT 'English',
    customize_email BOOLEAN DEFAULT false,
    uuid_enabled BOOLEAN DEFAULT true,
    verification_code_enabled BOOLEAN DEFAULT true
);

-- Document Receivers Table: Stores receivers and their auth requirements
CREATE TABLE IF NOT EXISTS document_receivers (
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


-- Signatures Table: Tracks signature positioning and status on documents
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    x_coordinate NUMERIC(10, 2) NOT NULL,
    y_coordinate NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    signed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table: Tracks actions performed on documents
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(255),
    user_agent TEXT,
    metadata JSONB,
    request_id UUID,
    session_id TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);