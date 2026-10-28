import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { isProd } from '../config/env';
import { AppError } from '../utils/AppError';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
    });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: { message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : `Upload error: ${err.message}` } });
  }
  if (err?.name === 'CastError') return res.status(400).json({ error: { message: 'Invalid identifier' } });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  if (err?.code === 11000) return res.status(409).json({ error: { message: 'A record with these details already exists' } });

  console.error('[unhandled]', err);
  res.status(500).json({ error: { message: 'Something went wrong on our side', ...(isProd ? {} : { debug: String(err?.stack ?? err) }) } });
};
