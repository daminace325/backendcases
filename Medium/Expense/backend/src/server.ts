import express from "express";
import { Pool } from "pg";

const app = express();
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
    user: "damin",
    password: "pass",
    database: "expense",
    host: "localhost",
    port: 5432
})

app.listen(PORT, ()=>{
    console.log(`Server start on at ${PORT}`);
})

app.get("/summary", (req, res) => {
})
