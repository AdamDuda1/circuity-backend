import { Request, Response, Router } from 'express';
import Database from 'better-sqlite3';
import {auth} from "./admin_auth";
import path from "path";

const router = Router();
const dbPath = process.env.DB_PATH ?? path.resolve(process.cwd(), 'circuity.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS projects
    (
        id			INTEGER PRIMARY KEY,
	    content		TEXT NOT NULL,
	    author 		TEXT NOT NULL,
        visibility	TEXT NOT NULL DEFAULT 'private',
        created_at	DATETIME DEFAULT CURRENT_TIMESTAMP,
        secret 		TEXT NOT NULL
    )
`);

/**
 * GET /v1/projects/get - Fetch all projects with pagination
 * Body: {limit?: number <-- number of elements on the page, page?: number}
 * defaults to 18 elements on the page and page 1
 */
router.get('/get', (req: Request, res: Response) => {
	try {
		const limitValue = Number(req.query.limit ?? 18); // no. of elements on the page
		const pageValue = Number(req.query.page ?? 1);

		const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 20;
		const page = Number.isFinite(pageValue) ? Math.max(pageValue, 1) : 1;

		const stmt = db.prepare(
			'SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?'
		);
		const blogPosts = stmt.all(limit, (page - 1) * limit);
		res.json(blogPosts);
	} catch (error) {
		console.log('Failed to fetch projects: ' + error);
		res.status(500).json({error: 'Failed to fetch projects!'});
	}
});

/**
 * POST /v1/projects/create - Sends a new projects to the server
 * Body: {content: string, author: string, secret: string, is_public: boolean}
 * secret is used to later edit or delete the project,
 * so it should be unique and not guessable (encrypted??? decided by the client)
 */
router.post('/create', (req: Request, res: Response) => {
	try {
		const {content, author, secret, visibility} = req.body;

		const stmt = db.prepare('INSERT INTO projects (content, author, visibility, secret) VALUES (?, ?, ?, ?)');
		const info = stmt.run(content, author, visibility, secret);

		res.json({status: 'success', info: info});
	} catch (error) {
		console.log('Failed to create project: ' + error);
		res.status(500).json({error: 'Failed to create!!!!'});
	}
});

export default router;
