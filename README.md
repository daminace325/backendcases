# Backend Practice

Express + TypeScript + PostgreSQL practice projects, grouped by difficulty.

To run an existing project, `cd` into its `backend/` folder, then `npm install` and `npm run dev`.

The rest of this file is the recipe for starting a new one.

## 1. Initialize Node.js Project

```bash
mkdir <project-name>
cd <project-name>
npm init -y
```

## 2. Install Dependencies

### Runtime

```bash
npm install express pg
```

### Development

```bash
npm install -D typescript tsx @types/node @types/express @types/pg
```

## 3. Initialize TypeScript

```bash
npx tsc --init
```

In `tsconfig.json`, enable Node types so core modules and `process` resolve:

```json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "types": ["node"]
  }
}
```

Create the source directory:

```text
src/
└── server.ts
```

## 4. Configure Development Script

Add to `package.json`. `"type": "module"` is required for the `nodenext` module setting:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/server.ts"
  }
}
```

Start the server:

```bash
npm run dev
```

## 5. Basic Express Server

```ts
import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
});
```

## 6. Start PostgreSQL with Docker

```bash
docker run --name <project-name>-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=<database-name> -p 5432:5432 -d postgres:18
```

Check that it is running:

```bash
docker ps
```

The container persists across reboots, so restart it instead of re-running `docker run`:

```bash
docker start <project-name>-postgres
```

Only one container can hold port `5432`. Stop the other one, or map a different host port with `-p 5433:5432`.

## 7. PostgreSQL Connection

```ts
import { Pool } from "pg";

const pool = new Pool({
    user: "postgres",
    password: "postgres",
    database: "<database-name>",
    host: "localhost",
    port: 5432
});
```

Inline credentials are fine for local practice. Move them to `.env` (already git-ignored) for anything real.

Connection flow:

```text
Node.js
   ↓
pg Pool
   ↓
localhost:5432
   ↓
Docker PostgreSQL
   ↓
Database
```

## 8. Access PostgreSQL CLI

```bash
docker exec -it <project-name>-postgres psql -U postgres -d <database-name>
```

## 9. Create Database Schema

Write the required `CREATE TABLE` statements inside `psql`.

Example:

```sql
CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    ...
);
```

Verify a table:

```sql
\d <table-name>
```

View data:

```sql
SELECT * FROM <table-name>;
```

## Setup Flow

```text
Node project initialized
    ↓
Express installed
    ↓
pg installed
    ↓
TypeScript configured
    ↓
tsx configured
    ↓
Express server running
    ↓
PostgreSQL container running
    ↓
Database created
    ↓
pg Pool configured
    ↓
Schema created
    ↓
Schema verified
```

## Development Flow

```text
Requirement
    ↓
Database schema
    ↓
API design
    ↓
Express route
    ↓
Validation
    ↓
SQL query
    ↓
Database
    ↓
HTTP response
```

Pass user input as query parameters, never string concatenation:

```ts
await pool.query("SELECT * FROM books WHERE id = $1", [id]);
```