---
name: query-db
description: Query the BourbonVault Supabase database using the CLI. Runs SQL against the linked remote database via `npx supabase db query --linked`. Use when the user wants to inspect DB state, audit schema, check constraints, verify migrations ran, count rows, sample data, or answer any question about what is actually in the database.
---

# query-db

## Quick start

Run any SQL against the remote DB:

```bash
npx supabase db query --linked "SELECT * FROM bourbons LIMIT 5;"
```

The CLI must be run from the project root: `/Users/ryankolsen/IdeaProjects/bourbon-app`

## Workflows

### Audit schema
```bash
# List all tables
npx supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Check columns on a table
npx supabase db query --linked "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '<table>' ORDER BY ordinal_position;"

# Check constraints
npx supabase db query --linked "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.<table>'::regclass;"

# List views
npx supabase db query --linked "SELECT table_name FROM information_schema.views WHERE table_schema = 'public';"

# List RPCs
npx supabase db query --linked "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;"
```

### Inspect data
```bash
# Row counts
npx supabase db query --linked "SELECT COUNT(*) FROM <table>;"

# Sample rows
npx supabase db query --linked "SELECT * FROM <table> LIMIT 10;"
```

### Verify a migration
```bash
# Confirm column exists
npx supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '<table>' AND column_name = '<col>';"

# Confirm column is gone
# (empty result = column was dropped successfully)
```

## Schema reference

See [REFERENCE.md](REFERENCE.md) for the full table/view/RPC inventory.