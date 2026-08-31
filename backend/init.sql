-- PostgreSQL initialization script for LeadFlow Dashboard
-- This runs automatically when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database user if not exists (handled by POSTGRES_USER env)
-- CREATE USER leadflow WITH PASSWORD 'changeme';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE leadflow TO leadflow;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO leadflow;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO leadflow;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO leadflow;

-- Create indexes for better performance (will be created by SQLAlchemy too)
-- These are just examples - actual indexes are defined in models

-- Enable pg_trgm for better text search
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set timezone
SET timezone = 'Europe/Prague';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'LeadFlow Dashboard database initialized';
END $$;