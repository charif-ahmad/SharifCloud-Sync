/**
 * Database Initialization Script
 * Creates the database and tables if they don't exist.
 * Run with: npm run db:init
 */

const { Client } = require('pg');
const config = require('./index');

async function initDatabase() {
  // First, connect without specifying a database to create it
  const adminClient = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: 'postgres', // Connect to default DB
  });

  try {
    await adminClient.connect();
    console.log('🔌 Connected to PostgreSQL server');

    // Check if database exists
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.db.name]
    );

    if (dbCheck.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE ${config.db.name}`);
      console.log(`✅ Database "${config.db.name}" created`);
    } else {
      console.log(`📦 Database "${config.db.name}" already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Now connect to the project database and create tables
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
  });

  try {
    await client.connect();
    console.log(`🔌 Connected to database "${config.db.name}"`);

    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log('✅ pgcrypto extension enabled');

    // Create folders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_folder_in_parent UNIQUE (name, parent_id)
      )
    `);
    console.log('✅ Table "folders" created (or already exists)');

    // Create photos table with folder_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name   VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_path   VARCHAR(500) NOT NULL UNIQUE,
        file_size   BIGINT NOT NULL,
        mime_type   VARCHAR(50) NOT NULL,
        hash        VARCHAR(128) NOT NULL UNIQUE,
        folder_id   UUID REFERENCES folders(id) ON DELETE SET NULL,
        taken_at    TIMESTAMPTZ,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT valid_mime CHECK (mime_type IN (
          'image/jpeg', 'image/png', 'image/webp', 'image/heic'
        )),
        CONSTRAINT positive_size CHECK (file_size > 0)
      )
    `);
    console.log('✅ Table "photos" created (or already exists)');

    // Add folder_id column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'photos' AND column_name = 'folder_id'
        ) THEN
          ALTER TABLE photos ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos (uploaded_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos (hash)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_mime_type ON photos (mime_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_photos_folder_id ON photos (folder_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id)
    `);
    console.log('✅ Indexes created');

    // Create storage stats view
    await client.query(`
      CREATE OR REPLACE VIEW storage_stats AS
      SELECT
        COUNT(*)                                     AS total_photos,
        COALESCE(SUM(file_size), 0)                 AS total_size_bytes,
        pg_size_pretty(COALESCE(SUM(file_size), 0)) AS total_size_human,
        (SELECT COUNT(*) FROM folders)              AS total_folders,
        MIN(uploaded_at)                             AS first_upload,
        MAX(uploaded_at)                             AS last_upload
      FROM photos
    `);
    console.log('✅ View "storage_stats" created');

    console.log('\n🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing tables:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
