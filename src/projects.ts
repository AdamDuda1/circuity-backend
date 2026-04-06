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
	    secret 		TEXT NOT NULL,
        created_at	DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

router.get('/get', (req: Request, res: Response) => {
	//
});


router.post('/create', (req: Request, res: Response) => {
	//
});

export default router;
