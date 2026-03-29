import express from 'express';
import cors, { CorsOptions } from 'cors';
import blogRouter from './blog';
import adminAuthRouter from './admin_auth';

const app = express();
const port = Number(process.env.PORT ?? 2137);

const defaultAllowedOrigins = [
	'https://circuity.deltos.space',
	'http://localhost:4200'
];

const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
.split(',')
.map((origin) => origin.trim())
.filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;

const corsOptions: CorsOptions = {
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));
app.use(express.json());

app.use('/v1/blog', blogRouter);
app.use('/v1/admin_auth', adminAuthRouter);

app.listen(port, '0.0.0.0', () => {
	console.log(`Backend running at http://localhost:${port}`);
});