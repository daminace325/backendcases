import express from "express";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

const app = express();
const PORT = 3000;

app.use(express.json());

app.listen(PORT, () => {
    console.log("Server running at ", PORT);
})

const pool = new Pool({
    user: "postgres",
    password: "postgres",
    database: "url_short",
    host: "localhost",
    port: 5432
});

// Check the db connection
// pool.query("SELECT NOW()")
//     .then((res) => {
//         console.log("Database connected: ", res.rows[0]);
//     })
//     .catch((err) => {
//         console.error("Database connection failed: ", err);
//     });

app.post("/url", async (req, res) => {
    const { originalUrl } = req.body;
    if (typeof originalUrl !== "string") {
        return res.status(400).json({ error: "URL is required" });
    }
    let url: URL;
    try {
        url = new URL(originalUrl);
    } catch (error) {
        return res.status(400).json({ error: "Invalid URL" });
    }
    let finalRes;
    let attempt = 0;
    while (!finalRes && attempt < 5) {
        attempt++;
        try {
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return res.status(400).json({ error: "URL must be HTTP/HTTPS" });
            }
            const shortCode = randomBytes(5).toString("base64url").slice(0, 7);
            const result = await pool.query(
                "insert into urls (short_code, original_url) values ($1, $2) ON CONFLICT (short_code) DO NOTHING RETURNING *",
                [shortCode, originalUrl]
            );
            if (result.rows.length > 0) {
                finalRes = result;
                return res.status(201).json(result.rows[0]);
            }
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    return res.status(409).json({ error: "Unqiue code cannot be generated" });
});

app.get("/url/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shortCode = String(id);
        const result = await pool.query(
            "update urls set click_count = click_count + 1 where short_code = $1 and (expires_at is null or expires_at > NOW()) returning *",
            [shortCode]
        );
        if (result.rows.length === 0) {
            const check = await pool.query(
                "select id from urls where short_code = $1",
                [shortCode]
            );
            if (check.rows.length === 0) return res.status(404).json({ error: "URL not found" });
            return res.status(410).json({ error: "URL expired" });
        }
        return res.redirect(result.rows[0].original_url);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});