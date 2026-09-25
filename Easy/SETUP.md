# Backend Setup

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

Create the source directory:

```text
src/
└── server.ts
```

## 4. Configure Development Script

Add to `package.json`:

```json
{
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
docker run --name todo-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=todo_app -p 5432:5432 -d postgres:18
```

Check that it is running:

```bash
docker ps
```

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

## Setup Checklist

- [ ] Node project initialized
- [ ] Express installed
- [ ] PostgreSQL `pg` installed
- [ ] TypeScript configured
- [ ] `tsx` configured
- [ ] Express server running
- [ ] PostgreSQL Docker container running
- [ ] PostgreSQL database created
- [ ] `pg` Pool configured
- [ ] Database schema created
- [ ] Schema verified

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