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
    const url = new URL(originalUrl);
    let finalRes;
    let attempt = 0;
    while (!finalRes && attempt < 5) {
        attempt++;
        try {
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return res.status(400).json({ error: "Invalid URL" });
            }
            const shortCode = randomBytes(5).toString("base64url").slice(0, 7);
            const result = await pool.query(
                "insert into urls (short_code, original_url) values ($1, $2) ON CONFLICT (short_code) DO NOTHING RETURNING *",
                [shortCode, originalUrl]
            );
            if(result.rows.length > 0) {
                finalRes = result;
                return res.status(201).json(result.rows[0]);
            }
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    return res.status(409).json({ error: "Unqiue code cannot be generated" });
})