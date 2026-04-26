"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const dbPath = (_a = process.env.DB_PATH) !== null && _a !== void 0 ? _a : path_1.default.resolve(process.cwd(), 'circuity.db');
const db = new better_sqlite3_1.default(dbPath);
const SECRET = (_b = process.env.SECRET) !== null && _b !== void 0 ? _b : 'secretkey123';
if (!SECRET) {
    throw new Error('Missing SECRET environment variable');
}
const JWT_SECRET = SECRET;
const TOKEN_TTL = '5w';
function getCredentials(body) {
    var _a, _b;
    if (!body || typeof body !== 'object')
        return null;
    const payload = body;
    const rawLogin = (_a = payload.login) !== null && _a !== void 0 ? _a : payload.l;
    const rawPassword = (_b = payload.password) !== null && _b !== void 0 ? _b : payload.p;
    if (typeof rawLogin !== 'string' || typeof rawPassword !== 'string')
        return null;
    const login = rawLogin.trim();
    if (!login || !rawPassword)
        return null;
    return { login, password: rawPassword };
}
db.exec(`
    CREATE TABLE IF NOT EXISTS admins
    (
        id 			INTEGER PRIMARY KEY,
	    login		TEXT NOT NULL UNIQUE,
	    password	TEXT NOT NULL
    )
`);
db.prepare('INSERT OR IGNORE INTO admins (login, password) VALUES (?, ?)').run('admin123', bcrypt_1.default.hashSync('admin123', 10));
function auth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing bearer token!' });
    }
    const token = header.split(' ')[1];
    try {
        req.user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
}
router.get('/list_admins', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admins = db.prepare('SELECT id, login, password FROM admins').all();
    res.json(admins);
}));
router.post('/register', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const credentials = getCredentials(req.body);
    if (!credentials) {
        return res.status(400).json({ error: 'Missing credentials' });
    }
    const hashed = yield bcrypt_1.default.hash(credentials.password, 10);
    try {
        db.prepare('INSERT INTO admins (login, password) VALUES (?, ?)').run(credentials.login, hashed);
        res.json({ message: 'User created' });
    }
    catch (error) {
        if (error &&
            typeof error === 'object' &&
            'code' in error &&
            ((_a = error.code) === null || _a === void 0 ? void 0 : _a.startsWith('SQLITE_CONSTRAINT'))) {
            return res.status(400).json({ error: 'User exists' });
        }
        console.log('Admin register: ' + error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const credentials = getCredentials(req.body);
    if (!credentials) {
        return res.status(400).json({ error: 'Missing credentials' });
    }
    const user = db
        .prepare('SELECT id, login, password FROM admins WHERE login = ?')
        .get(credentials.login);
    if (!user) {
        return res.status(401).json({ error: 'Invalid login or password' });
    }
    const valid = yield bcrypt_1.default.compare(credentials.password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid login or password' });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.login }, JWT_SECRET, {
        expiresIn: TOKEN_TTL
    });
    res.json({ token });
}));
exports.default = router;
