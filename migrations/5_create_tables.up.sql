-- Drop existing tables
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

-- Create new users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id UUID NOT NULL
);
