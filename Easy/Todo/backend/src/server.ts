import express from "express";
import { Pool } from "pg";

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
    user: "postgres",
    password: "postgres",
    database: "todo_app",
    host: "localhost",
    port: 5432
})

app.listen(PORT, () => {
    console.log("Server started at ", PORT);
})

app.get("/health", async (req, res) => {
    return res.json({ status: "ok" });
})

app.post("/todos", async (req, res) => {
    try {
        const { title } = req.body;
        if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "title is required" });
        const result = await pool.query(
            "INSERT INTO todos (title) VALUES ($1) RETURNING *",
            [title]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.get("/todos", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM todos ORDER BY created_at DESC"
        );
        return res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.get("/todos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT * FROM todos WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "not found" });
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.patch("/todos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, completed } = req.body;
        const fields = [];
        const values = [];
        let cnt = 0;
        if (title !== undefined) {
            if (typeof title !== "string" || title.trim().length === 0) return res.status(400).json({ error: "title is invalid" });
            cnt++;
            fields.push(`title = $${cnt}`);
            values.push(title);
        }
        if (completed !== undefined) {
            if (typeof completed !== "boolean") return res.status(400).json({ error: "completed flag is invalid" });
            cnt++;
            fields.push(`completed = $${cnt}`);
            values.push(completed);
        }
        if (fields.length === 0) {
            return res.status(400).json({
                error: "no fields to updates"
            })
        }
        cnt++;
        values.push(id);
        const result = await pool.query(
            `UPDATE todos
            SET ${fields.join(", ")}
            WHERE id = $${cnt}
            RETURNING *`,
            values
        )
        if (result.rows.length === 0) return res.status(404).json({ error: "not found" });
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

app.delete("/todos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM todos WHERE id = $1",
            [id]
        )
        if (result.rowCount === 0) return res.status(404).json({ error: "not found" });
        return res.status(204).send();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" })
    }
})