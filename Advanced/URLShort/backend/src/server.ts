import express from "express";
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

