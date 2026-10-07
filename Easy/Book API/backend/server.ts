import express from "express";
import { error } from "node:console";
import { DatabaseError, Pool } from "pg";

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
    user: "postgres",
    password: "postgres",
    database: "book_api",
    port: 5432
});

app.get("/health", (req, res) => {
    return res.status(200).json({ status: "ok" });
});

app.get("/book", async (req, res) => {
    try {
        const { page = 1, limit = 20, search, author_id } = req.query;
        const pageNum = Number(page), limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum <= 0) return res.status(400).json({ error: "Invalid page number" });
        if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 40) return res.status(400).json({ error: "Invalid limit number" });
        const conditions: string[] = [];
        const values: any[] = [];

        if (search !== undefined) {
            if (typeof search !== "string" || search.trim().length === 0) return res.status(400).json({ error: "Invalid search" });
            conditions.push(`b.title ILIKE $${values.length + 1}`);
            values.push(`%${search.trim()}%`);
        }
        if (author_id !== undefined) {
            const authorId = Number(author_id);
            if (!Number.isInteger(authorId) || authorId <= 0) return res.status(400).json({ error: "Invalid author id" });
            conditions.push(`b.author_id = $${values.length + 1}`);
            values.push(authorId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const offset = (pageNum - 1) * limitNum;

        const result = await pool.query(
            `select b.id, b.title, b.created_At, a.id as author_id, a.name as author_name, a.email as author_email from book as b join author as a on b.author_id = a.id ${whereClause} order by b.created_At desc, b.id desc limit $${values.length + 1} offset $${values.length + 2}`,
            [...values, limitNum, offset]
        );

        const totalCnt = await pool.query(
            `select count(*) from book as b join author as a on b.author_id = a.id ${whereClause}`,
            values
        );
        const total = Number(totalCnt.rows[0].count);
        return res.status(200).json({
            data: result.rows,
            page: pageNum,
            limit: limitNum,
            total
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/book", async (req, res) => {
    try {
        const { id, title } = req.body;
        const author_id = Number(id);
        if (!Number.isInteger(author_id) || author_id <= 0) return res.status(400).json({ error: "Invalid author id" });
        if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "Title is required" });
        const result = await pool.query(
            "insert into book (author_id, title) values ($1, $2) returning *",
            [author_id, title.trim()]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23503") {
            return res.status(400).json({ error: "Author not found" });
        }
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/book/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const bookId = Number(id);
        if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: "Invalid book id" });
        const result = await pool.query(
            "select b.id, b.title, b.created_At, a.id as author_id, a.name as author_name, a.email as author_email from book as b join author as a on b.author_id = a.id where b.id = $1",
            [bookId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Book not found" });
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/book/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const bookId = Number(id);

        if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: "Invalid book id" });

        const { title, author_id } = req.body;
        const updates: Record<string, any> = {};

        if (title !== undefined) {
            if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "Invalid title" });
            updates["title"] = title.trim();
        }

        if (author_id !== undefined) {
            if (typeof author_id !== "number" || author_id <= 0) return res.status(400).json({ error: "Invalid author id" });
            updates["author_id"] = author_id;
        }

        const keys = Object.keys(updates);

        if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });

        const setClauses = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
        const values = keys.map((key) => updates[key]);

        const result = await pool.query(
            `update book set ${setClauses} where id = $${values.length + 1} returning *`,
            [...values, bookId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Book not found" });

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23503") {
            return res.status(400).json({ error: "Author not found" });
        }
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/book/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const bookId = Number(id);
        if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: "Invalid book id" });
        const result = await pool.query(
            "delete from book where id = $1",
            [bookId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Book not found" });
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/author", async (req, res) => {
    try {
        const result = await pool.query(
            "select * from author"
        );
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/author", async (req, res) => {
    try {
        const { name, email } = req.body;
        if (typeof name !== "string" || name.trim().length === 0) return res.status(400).json({ error: "Name is required" });
        if (typeof email !== "string" || email.trim().length === 0) return res.status(400).json({ error: "Email is required" });
        const result = await pool.query(
            "insert into author (name, email) values ($1, $2) returning *",
            [name.trim(), email.trim()]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23505") {
            return res.status(409).json({ error: "Email already exists" });
        }
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/author/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const authorId = Number(id);
        if (!Number.isInteger(authorId) || authorId <= 0) return res.status(400).json({ error: "Invalid author id" });
        const result = await pool.query(
            "delete from author where id = $1",
            [authorId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Author not found" });
        return res.status(204).send();
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23503") {
            return res.status(409).json({ error: "Cannot delete author because books still reference this author" });
        }
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/author/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const authorId = Number(id);

        if (!Number.isInteger(authorId) || authorId <= 0) return res.status(400).json({ error: "Invalid author id" });

        const { name, email } = req.body;

        const setClauses: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length === 0) return res.status(400).json({ error: "Invalid name" });
            setClauses.push(`name = $${values.length + 1}`);
            values.push(name.trim());
        }

        if (email !== undefined) {
            if (typeof email !== "string" || email.trim().length === 0) return res.status(400).json({ error: "Invalid email" });
            setClauses.push(`email = $${values.length + 1}`);
            values.push(email.trim());
        }

        if (setClauses.length === 0) return res.status(400).json({ error: "No fields to update" });

        const result = await pool.query(
            `update author set ${setClauses.join(", ")} where id = $${values.length + 1} returning *`,
            [...values, authorId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Author not found" });

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23505") {
            return res.status(409).json({ error: "Email already exists" });
        }
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/authorandbook", async (req, res) => {
    const { name, email, title } = req.body;
    if (typeof name !== "string" || name.trim().length === 0) return res.status(400).json({ error: "Invalid author name" });
    if (typeof email !== "string" || email.trim().length === 0) return res.status(400).json({ error: "Invalid author email" });
    if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "Invalid book title" });

    const client = await pool.connect();
    try {
        await client.query('begin');

        const result1 = await client.query(
            'insert into author (name, email) values ($1, $2) returning *',
            [name.trim(), email.trim()]
        );
        const author_id = Number(result1.rows[0].id);
        // throw error; // to simulate the working of transaction
        const result2 = await client.query(
            'insert into book (author_id, title) values ($1, $2) returning *',
            [author_id, title.trim()]
        );

        await client.query('commit');
        return res.status(201).json({ "author": result1.rows[0], "book": result2.rows[0] });
    } catch (error) {
        await client.query('rollback');
        console.log(error);
        return res.status(500).json({ error: "Internal server error " });
    } finally {
        client.release();
    }
});

app.listen(PORT, () => {
    console.log("Server running at ", PORT);
});