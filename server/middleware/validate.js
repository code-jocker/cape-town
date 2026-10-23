import { AppError } from '../utils/AppError.js';

/**
 * Zod validation middleware. Validates req[source] and replaces it with the
 * parsed (coerced/stripped) result so controllers get clean data.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue.path.join('.');
      return next(
        new AppError(
          'VALIDATION_ERROR',
          `${path ? path + ': ' : ''}${issue.message}`,
          422
        )
      );
    }
    req[source] = result.data;
    next();
  };
