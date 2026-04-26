"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const admin_auth_1 = require("./admin_auth");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const dbPath = (_a = process.env.DB_PATH) !== null && _a !== void 0 ? _a : path_1.default.resolve(process.cwd(), 'circuity.db');
const db = new better_sqlite3_1.default(dbPath);
db.exec(`
    CREATE TABLE IF NOT EXISTS blog
    (
        id			INTEGER PRIMARY KEY,
        title		TEXT NOT NULL,
        text		TEXT NOT NULL,
	    media_type	TEXT,
        media_link	TEXT NOT NULL,
        created_at	DATETIME DEFAULT CURRENT_TIMESTAMP
    );

	CREATE TABLE IF NOT EXISTS blog_comments
    (
        id			INTEGER PRIMARY KEY,
	    post_id		INTEGER REFERENCES blog(id) ON DELETE CASCADE,
	    content		TEXT NOT NULL,
	    author		TEXT NOT NULL,
	    created_at	DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`);
/**
 * GET /v1/blog/single_post?id=123 - Fetch a single blog post by ID (or last post if without id)
 */
router.get('/single_post', (req, res) => {
    try {
        const { id } = req.query;
        const query = id ? 'SELECT * FROM blog WHERE id = ?' : 'SELECT * FROM blog';
        const stmt = db.prepare(query);
        const post = id ? stmt.get(id) : stmt.get();
        if (post) {
            res.json(post);
        }
        else {
            res.status(404).json({ error: 'Post not found' });
        }
    }
    catch (error) {
        console.log('Failed to fetch post: ' + error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});
/**
 * GET /v1/blog/read - Fetch all posts at once
 */
router.get('/read', (req, res) => {
    var _a, _b;
    try {
        const limitValue = Number((_a = req.query.limit) !== null && _a !== void 0 ? _a : 20);
        const pageValue = Number((_b = req.query.page) !== null && _b !== void 0 ? _b : 1);
        const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 20;
        const page = Number.isFinite(pageValue) ? Math.max(pageValue, 1) : 1;
        const offset = (page - 1) * limit;
        const stmt = db.prepare('SELECT id, title, text, media_type, media_link, created_at FROM blog ORDER BY created_at DESC LIMIT ? OFFSET ?');
        const blogPosts = stmt.all(limit, offset);
        res.json(blogPosts);
    }
    catch (error) {
        console.log('Failed to fetch posts: ' + error);
        res.status(500).json({ error: 'Failed to fetch posts!' });
    }
});
/**
 * POST /v1/blog/create? - Create a new blog post with title, text, and media_link
 * Body: { title: string, text: string, media_link: string }
 */
router.post('/create', admin_auth_1.auth, (req, res) => {
    try {
        const { title, text, media_type, media_link } = req.body;
        const stmt = db.prepare('INSERT INTO blog (title, text, media_type, media_link) VALUES (?, ?, ?, ?)');
        const info = stmt.run(title, text, media_type, media_link);
        res.json({ status: 'success', info: info });
    }
    catch (error) {
        console.log('Failed to post blog: ' + error);
        res.status(500).json({ error: 'Failed to post blog!!!!' });
    }
});
/**
 * GET /v1/blog/read_comments - Fetch all blog comments, optionally filtered by comment_id (blog post ID)
 */
router.get('/read_comments', (req, res) => {
    try {
        const postIdRaw = req.query.post_id;
        const postId = Number(postIdRaw);
        const hasCommentId = Number.isFinite(postId);
        const query = hasCommentId
            ? 'SELECT id, post_id, content, author, created_at FROM blog_comments WHERE post_id = ? ORDER BY created_at DESC'
            : 'SELECT id, post_id, content, author, created_at FROM blog_comments ORDER BY created_at DESC';
        const stmt = db.prepare(query);
        const comments = hasCommentId ? stmt.all(postId) : stmt.all();
        res.json(comments);
    }
    catch (error) {
        console.log('Failed to fetch comments: ' + error);
        res.status(500).json({ error: 'Failed to fetch comments!' });
    }
});
/**
 * POST /v1/blog/post_comment? - Create a new anonymous (public) comment under a specified blog post
 * Body: { comment_id, content, author }
 */
router.post('/post_comment', (req, res) => {
    try {
        const { post_id, content, author } = req.body;
        const stmt = db.prepare('INSERT INTO blog_comments (post_id, content, author) VALUES (?, ?, ?)');
        const info = stmt.run(post_id, content, author);
        res.json({ status: 'success', info: info });
    }
    catch (error) {
        console.log('Failed to post comment: ' + error);
        res.status(500).json({ error: 'Failed to post comment!!!!' });
    }
});
exports.default = router;
