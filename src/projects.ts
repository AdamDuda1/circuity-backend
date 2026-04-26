import { Request, Response, Router } from 'express';
import Database from 'better-sqlite3';
import path from "path";
import { auth } from './admin_auth';

const router = Router();
const dbPath = process.env.DB_PATH ?? path.resolve(process.cwd(), 'circuity.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS projects
    (
        id			INTEGER PRIMARY KEY,
	    content		TEXT NOT NULL,
	    author 		TEXT NOT NULL,
	    name		TEXT NOT NULL,
	    description	TEXT NOT NULL,
        visibility	TEXT NOT NULL DEFAULT 'private',
        created_at	DATETIME DEFAULT CURRENT_TIMESTAMP,
        secret 		TEXT NOT NULL
    )
`);

/**
 * GET /v1/projects/get
 * Query params:
 * - limit?: number (default 18, min 1, max 100)
 * - page?: number (default 1, min 1)
 *
 * Response 200: Array<{
 *   id: number;
 *   content: string;
 *   author: string;
 *   name: string;
 *   description: string;
 *   visibility: 'public' | 'private';
 *   created_at: string;
 * }>
 */
router.get('/get', (req: Request, res: Response) => {
	try {
		const limitValue = Number(req.query.limit ?? 18); // no. of elements on the page
		const pageValue = Number(req.query.page ?? 1);

		const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 18;
		const page = Number.isFinite(pageValue) ? Math.max(pageValue, 1) : 1;

		const stmt = db.prepare(
			'SELECT id, content, author, name, description, visibility, created_at FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?'
		);
		const projects = stmt.all(limit, (page - 1) * limit);
		res.json(projects);
	} catch (error) {
		console.log('Failed to fetch projects: ' + error);
		res.status(500).json({error: 'Failed to fetch projects!'});
	}
});

/**
 * POST /v1/projects/create
 * Body:
 * {
 *   content: string;
 *   author?: string; // defaults to 'anonymous'
 *   name: string;
 *   description?: string; // defaults to 'no description'
 *   secret: string;
 *   visibility?: 'public' | 'private'; // defaults to 'private'
 * }
 *
 * Validation:
 * - content, name, secret are required non-empty strings
 *
 * Response 200:
 * {
 *   status: 'success';
 *   project: {
 *     id: number;
 *     content: string;
 *     author: string;
 *     name: string;
 *     description: string;
 *     visibility: 'public' | 'private';
 *   }
 * }
 *
 * Response 400: { error: 'Invalid project payload' }
 * Response 500: { error: 'Failed to create project!' }
 */
router.post('/create', (req: Request, res: Response) => {
	try {
		const {content, author, name, description, secret} = req.body;
		const visibility = req.body.visibility === 'public' ? 'public' : 'private';
		const normalizedAuthor = typeof author === 'string' && author.trim() ? author.trim() : 'anonymous';
		const normalizedDescription = typeof description === 'string' && description.trim() ? description.trim() : 'no description';

		if (
			typeof content !== 'string' || !content.trim() ||
			typeof name !== 'string' || !name.trim() ||
			typeof secret !== 'string' || !secret.trim()
		) {
			return res.status(400).json({error: 'Invalid project payload'});
		}

		const stmt = db.prepare('INSERT INTO projects (content, author, name, description, visibility, secret) VALUES (?, ?, ?, ?, ?, ?)');
		const info = stmt.run(content.trim(), normalizedAuthor, name.trim(), normalizedDescription, visibility, secret.trim());

		res.json({
			status: 'success',
			project: {
				id: info.lastInsertRowid,
				content: content.trim(),
				author: normalizedAuthor,
				name: name.trim(),
				description: normalizedDescription,
				visibility,
			}
		});
	} catch (error) {
		console.log('Failed to create project: ' + error);
		res.status(500).json({error: 'Failed to create project!'});
	}
});

/**
 * POST /v1/projects/single-project
 * Gets one project with the secret key
 * Body: { secret: string }
 *
 * Response 200:
 * {
 *   status: 'success';
 *   project: {
 *     id: number;
 *     name: string;
 *     content: string;
 *     created_at: string;
 *   }
 * }
 *
 * Response 400: { error: 'Invalid secret payload' }
 * Response 404: { error: 'Project not found' }
 */
router.post('/single-project', (req: Request, res: Response) => {
	try {
		const {secret} = req.body;

		if (typeof secret !== 'string' || !secret.trim()) {
			return res.status(400).json({error: 'Invalid secret payload'});
		}

		const stmt = db.prepare('SELECT id, name, content, created_at FROM projects WHERE secret = ? LIMIT 1');
		const project = stmt.get(secret.trim()) as {id: number; name: string; content: string; created_at: string} | undefined;

		if (!project) {
			return res.status(404).json({error: 'Project not found'});
		}

		res.json({
			status: 'success',
			project,
		});
	} catch (error) {
		console.log('Failed to fetch project content: ' + error);
		res.status(500).json({error: 'Failed to fetch project content!'});
	}
});

/**
 * POST /v1/projects/delete
 * Deletes one project by secret key
 * Body: { secret: string }
 *
 * Response 200: { status: 'success' }
 * Response 400: { error: 'Invalid secret payload' }
 * Response 404: { error: 'Project not found' }
 */
router.post('/delete', (req: Request, res: Response) => {
	try {
		const {secret} = req.body;

		if (typeof secret !== 'string' || !secret.trim()) {
			return res.status(400).json({error: 'Invalid secret payload'});
		}

		const stmt = db.prepare('DELETE FROM projects WHERE secret = ?');
		const result = stmt.run(secret.trim());

		if (result.changes === 0) {
			return res.status(404).json({error: 'Project not found'});
		}

		res.json({status: 'success'});
	} catch (error) {
		console.log('Failed to delete project: ' + error);
		res.status(500).json({error: 'Failed to delete project!'});
	}
});

/**
 * GET /v1/projects/admin/list
 * Auth required. Returns all projects for admin management.
 */
router.get('/admin/list', auth, (req: Request, res: Response) => {
	try {
		const stmt = db.prepare(
			'SELECT id, content, author, name, description, visibility, created_at FROM projects ORDER BY created_at DESC'
		);
		const projects = stmt.all();
		res.json(projects);
	} catch (error) {
		console.log('Failed to fetch projects for admin: ' + error);
		res.status(500).json({error: 'Failed to fetch projects!'});
	}
});

/**
 * PATCH /v1/projects/admin/:id
 * Auth required. Updates content, author and description.
 */
router.patch('/admin/:id', auth, (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const {content, author, description} = req.body as {
			content?: unknown;
			author?: unknown;
			description?: unknown;
		};

		if (!Number.isInteger(id) || id < 1) {
			return res.status(400).json({error: 'Invalid project id'});
		}

		if (
			typeof content !== 'string' || !content.trim() ||
			typeof author !== 'string' || !author.trim() ||
			typeof description !== 'string' || !description.trim()
		) {
			return res.status(400).json({error: 'Invalid project payload'});
		}

		const stmt = db.prepare('UPDATE projects SET content = ?, author = ?, description = ? WHERE id = ?');
		const result = stmt.run(content.trim(), author.trim(), description.trim(), id);

		if (result.changes === 0) {
			return res.status(404).json({error: 'Project not found'});
		}

		res.json({status: 'success'});
	} catch (error) {
		console.log('Failed to update project: ' + error);
		res.status(500).json({error: 'Failed to update project!'});
	}
});

/**
 * DELETE /v1/projects/admin/:id
 * Auth required. Deletes one project by id.
 */
router.delete('/admin/:id', auth, (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);

		if (!Number.isInteger(id) || id < 1) {
			return res.status(400).json({error: 'Invalid project id'});
		}

		const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
		const result = stmt.run(id);

		if (result.changes === 0) {
			return res.status(404).json({error: 'Project not found'});
		}

		res.json({status: 'success'});
	} catch (error) {
		console.log('Failed to delete project by id: ' + error);
		res.status(500).json({error: 'Failed to delete project!'});
	}
});

export default router;
