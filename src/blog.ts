import { Request, Response, Router } from 'express';
import Database from 'better-sqlite3';
import {auth} from "./admin_auth";
import path from "path";

const router = Router();
const dbPath = process.env.DB_PATH ?? path.resolve(process.cwd(), 'circuity.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS blog
    (
        id			INTEGER PRIMARY KEY,
        title		TEXT NOT NULL,
        text		TEXT NOT NULL,
	    media_type	TEXT NOT NULL,
        media_link	TEXT NOT NULL,
        created_at	DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

/**
 * GET /v1/blog/single_post?id=123 - Fetch a single blog post by ID (or last post if without id)
 */
router.get('/single_post', (req: Request, res: Response) => {
	try {
		const {id} = req.query;

		const query = id ? 'SELECT * FROM blog WHERE id = ?' : 'SELECT * FROM blog';
		const stmt = db.prepare(query);
		const post = id ? stmt.get(id) : stmt.get();

		if (post) {
			res.json(post);
		} else {
			res.status(404).json({error: 'Post not found'});
		}
	} catch (error) {
		res.status(500).json({error: 'Failed to fetch post'});
	}
});

/**
 * GET /v1/blog/read - Fetch all posts at once
 */
router.get('/read', (req: Request, res: Response) => {
	try {
		const limitValue = Number(req.query.limit ?? 20);
		const pageValue = Number(req.query.page ?? 1);

		const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 20;
		const page = Number.isFinite(pageValue) ? Math.max(pageValue, 1) : 1;
		const offset = (page - 1) * limit;

		const stmt = db.prepare(
			'SELECT id, title, text, media_type, media_link, created_at FROM blog ORDER BY created_at DESC LIMIT ? OFFSET ?'
		);
		const blogPosts = stmt.all(limit, offset);
		res.json(blogPosts);
	} catch (error) {
		res.status(500).json({error: 'Failed to fetch posts'});
	}
});

/**
 * POST /b1/blog/create? - Create a new blog post with title, text, and media_link
 * Body: { title: string, text: string, media_link: string }
 */
router.post('/create', auth,  (req: Request, res: Response) => {
	try {
		const {title, text, media_type, media_link} = req.body;

		const stmt = db.prepare('INSERT INTO blog (title, text, media_type, media_link) VALUES (?, ?, ?, ?)');
		const info = stmt.run(title, text, media_type, media_link);

		res.json({status: 'success', info: info});
	} catch (error) {
		res.status(500).json({error: 'Failed to post!!!!'});
	}
});

export default router;
