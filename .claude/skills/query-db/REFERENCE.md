# BourbonVault DB Reference

Project ID: `dmudeosnwcizorotxlrs`
CLI command: `npx supabase db query --linked "<sql>"`

## Discover the live schema

Always query the live schema rather than relying on hardcoded lists. Use these before writing any query against an unfamiliar table.

### All tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### All views
```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

### All RPCs (user-defined functions)
```sql
SELECT routine_name, pg_get_function_arguments(p.oid) AS args
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public'
ORDER BY routine_name;
```

### Columns for a specific table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '<table>'
ORDER BY ordinal_position;
```

### Check constraints on a table
```sql
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.<table>'::regclass AND contype = 'c';
```

### Foreign keys on a table
```sql
SELECT
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = '<table>';
```

### View definition
```sql
SELECT definition
FROM pg_views
WHERE schemaname = 'public' AND viewname = '<view>';
```

### RLS policies on a table
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '<table>';
```