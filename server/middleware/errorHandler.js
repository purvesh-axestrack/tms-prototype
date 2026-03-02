export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.status) {
    const body = { error: err.message };
    if (err.conflicts) body.conflicts = err.conflicts;
    return res.status(err.status).json(body);
  }

  res.status(500).json({ error: 'Internal server error' });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
