import express from 'express';
import cors from 'cors';
import blogRouter from './blog';
import adminAuthRouter from './admin_auth'

const app = express();
const port = 2137;

app.use(cors());
app.use(express.json());

app.use('/v1/blog', blogRouter);
app.use('/v1/admin_auth', adminAuthRouter);

app.listen(port, '0.0.0.0', () => {
	console.log(`Backend running at http://localhost:${port}`);
});