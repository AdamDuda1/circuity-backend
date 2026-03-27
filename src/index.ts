import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const port = 2137;

app.use(cors());
app.use(express.json());

const db = new Database('circuity.db');

db.exec(`
	CREATE TABLE IF NOT EXISTS blog (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		text TEXT NOT NULL,
		media_link TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`);

app.get('/v1/blog/read', (req: Request, res: Response) => {
	try {
		const stmt = db.prepare('SELECT * FROM blog');
		const blogPosts = stmt.all();
		res.json(blogPosts);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch posts" });
	}
});

app.post('/v1/blog/create', (req: Request, res: Response) => {
	try {
		const { title, text, media_link } = req.body;

		const stmt = db.prepare('INSERT INTO blog (title, text, media_link) VALUES (?, ?, ?)');
		const info = stmt.run(title, text, media_link);

		res.json({ status: 'success', info: info });
	} catch (error) {
		res.status(500).json({ error: "Failed to post!!!!" });
	}
});

app.listen(port, () => {
	console.log(`Backend running at http://localhost:${port}`); // ???????????????????? doesnt work
});