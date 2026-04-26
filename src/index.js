"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const blog_1 = __importDefault(require("./blog"));
const admin_auth_1 = __importDefault(require("./admin_auth"));
const projects_1 = __importDefault(require("./projects"));
const app = (0, express_1.default)();
const port = Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 2137);
const defaultAllowedOrigins = [
    'https://circuity.deltos.space',
    'https://circuity.vercel.apps',
    'https://circuity.adamd.pl.eu.org',
    'http://localhost:4200'
];
const configuredOrigins = ((_b = process.env.CORS_ORIGINS) !== null && _b !== void 0 ? _b : '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;
const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.options('/{*any}', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use('/v1/blog', blog_1.default);
app.use('/v1/admin_auth', admin_auth_1.default);
app.use('/v1/projects', projects_1.default);
app.listen(port, '0.0.0.0', () => {
    console.log(`Backend running at http://localhost:${port}`);
});
