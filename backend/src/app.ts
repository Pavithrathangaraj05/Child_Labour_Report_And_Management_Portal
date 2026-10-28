import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import routes from './routes';

export const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Upload-Token'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', globalLimiter, routes);
app.use(notFound);
app.use(errorHandler);
