import express from "express";
import { DatabaseError, Pool } from "pg";

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
    user: "postgres",
    password: "postgres",
    database: "book_api",
    port: 5432
})

app.listen(PORT, () => {
    console.log("Server running at ", PORT);
})

app.get("/health", (req, res) => {
    return res.status(200).json({ status: "ok" })
})

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
            if (!Number.isInteger(authorId) || authorId <= 0) return res.status(400).json({ error: "Invalid Author Id" });
            conditions.push(`b.author_id = $${values.length + 1}`);
            values.push(authorId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const offset = (pageNum - 1) * limitNum;

        const result = await pool.query(
            `select b.id, b.title, b.created_At, a.id as author_id, a.name as author_name, a.email as author_email from book as b join author as a on b.author_id = a.id${whereClause} order by b.created_At desc, b.id desc limit $${values.length + 1} offset $${values.length + 2}`,
            [ ...values, limitNum, offset]
        );

        const totalCnt = await pool.query(
            `select count(*) from book${whereClause}`,
            values
        )
        const total = Number(totalCnt.rows[0].count);
        return res.status(200).json({
            data: result.rows,
            page: pageNum,
            limit: limitNum,
            total
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.post("/book", async (req, res) => {
    try {
        const { author_id, title } = req.body;
        if (typeof author_id !== "number" || author_id <= 0) return res.status(400).json({ error: "Author Id is invalid" });
        if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "Title is required" });
        const result = await pool.query(
            "insert into book (author_id, title) values ($1, $2) returning *",
            [author_id, title]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23503") {
            return res.status(400).json({ error: "Author doesnt exists" })
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.get("/book/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const bookId = Number(id);
        if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: "Invalid Id" });
        const result = await pool.query(
            "select b.id, b.title, b.created_At, a.id as author_id, a.name as author_name, a.email as author_email from book as b join author as a on b.author_id = a.id where b.id = $1",
            [bookId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Book doesnt exists" });
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.patch("/book/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const bookId = Number(id);

        if (!Number.isInteger(bookId) || bookId <= 0) return res.status(400).json({ error: "Invalid Id" });

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

        if (result.rows.length === 0) return res.status(404).json({ error: "Book doesnt exists" });

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (error instanceof DatabaseError && error.code === "23503") {
            return res.status(400).json({ error: "Author doesn't exists" });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.get("/author", async (req, res) => {
    try {
        const result = await pool.query(
            "select * from author"
        );
        return res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
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
            [name, email]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
