import rateLimit from 'express-rate-limit';

/** 60 req/min per IP on content mutation endpoints */
export const contentMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

/** 10 req/min per IP on publish and AI endpoints */
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests on sensitive operation.' },
});
