import { NextFunction, Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';

const router = Router();
const db = new Database(path.resolve(process.cwd(), 'circuity.db'));

type AdminRow = {
	id: number;
	login: string;
	password: string;
};

type AuthenticatedRequest = Request & {
	user?: string | JwtPayload;
};

type Credentials = {
	login: string;
	password: string;
};

type SqliteIndexInfo = {
	seq: number;
	name: string;
	unique: number;
	origin: string;
	partial: number;
};

type SqliteIndexColumn = {
	seqno: number;
	cid: number;
	name: string;
};

// const SECRET = process.env.SECRET;
const SECRET = 'secretkey';
if (!SECRET) {
	throw new Error('Missing SECRET environment variable');
}
const JWT_SECRET: string = SECRET;
const TOKEN_TTL = '5w';

function getCredentials(body: unknown): Credentials | null {
	if (!body || typeof body !== 'object') return null;

	const payload = body as Record<string, unknown>;
	const rawLogin = payload.login ?? payload.l;
	const rawPassword = payload.password ?? payload.p;

	if (typeof rawLogin !== 'string' || typeof rawPassword !== 'string') return null;

	const login = rawLogin.trim();
	if (!login || !rawPassword) return null;

	return {login, password: rawPassword};
}

db.exec(`
    CREATE TABLE IF NOT EXISTS admins
    (
        id 			INTEGER PRIMARY KEY,
	    login		TEXT NOT NULL UNIQUE,
	    password	TEXT NOT NULL
    )
`);

function hasUniquePasswordConstraint(): boolean {
	const indexes = db.prepare('PRAGMA index_list(admins)').all() as SqliteIndexInfo[];

	return indexes.some((index) => {
		if (index.unique !== 1) {
			return false;
		}

		const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(index.name)})`).all() as SqliteIndexColumn[];
		return columns.some((column) => column.name === 'password');
	});
}

function migrateAdminsTableIfNeeded(): void {
	if (!hasUniquePasswordConstraint()) {
		return;
	}

	const migrate = db.transaction(() => {
		db.exec(`
			CREATE TABLE admins_new
			(
				id INTEGER PRIMARY KEY,
				login TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL
			)
		`);

		db.exec(`
			INSERT OR IGNORE INTO admins_new (id, login, password)
			SELECT id, login, password FROM admins
		`);

		db.exec('DROP TABLE admins');
		db.exec('ALTER TABLE admins_new RENAME TO admins');
	});

	migrate();
}

migrateAdminsTableIfNeeded();

db.prepare('INSERT OR IGNORE INTO admins (login, password) VALUES (?, ?)').run(
	'admin123',
	bcrypt.hashSync('admin123', 10)
);

export function auth(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) {
	const header = req.headers['authorization'];
	if (!header || !header.startsWith('Bearer ')) {
		return res.status(401).json({error: 'Missing bearer token'});
	}

	const token = header.split(' ')[1];

	try {
		req.user = jwt.verify(token, JWT_SECRET);
		next();
	} catch (error) {
		if (error instanceof TokenExpiredError) {
			return res.status(401).json({error: 'Token expired'});
		}

		return res.status(403).json({error: 'Invalid token'});
	}
}

router.post('/register', auth, async (req: Request, res: Response) => {
	const credentials = getCredentials(req.body);
	if (!credentials) {
		return res.status(400).json({error: 'Missing credentials'});
	}

	const hashed = await bcrypt.hash(credentials.password, 10);

	try {
		db.prepare('INSERT INTO admins (login, password) VALUES (?, ?)').run(credentials.login, hashed);
		res.json({message: 'User created'});
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code?.startsWith('SQLITE_CONSTRAINT')
		) {
			return res.status(400).json({error: 'User exists'});
		}

		return res.status(500).json({error: 'Internal server error'});
	}
});

router.post('/login', async (req: Request, res: Response) => {
	const credentials = getCredentials(req.body);
	if (!credentials) {
		return res.status(400).json({error: 'Missing credentials'});
	}

	const user = db
	.prepare('SELECT id, login, password FROM admins WHERE login = ?')
	.get(credentials.login) as AdminRow | undefined;

	if (!user) {
		return res.status(401).json({error: 'Invalid login or password'});
	}

	const valid = await bcrypt.compare(credentials.password, user.password);
	if (!valid) {
		return res.status(401).json({error: 'Invalid login or password'});
	}

	const token = jwt.sign({id: user.id, username: user.login}, JWT_SECRET, {
		expiresIn: TOKEN_TTL
	});

	res.json({token});
});


export default router;
