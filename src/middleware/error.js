module.exports = function (err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || '';
  const stack
    = process.env.NODE_ENV === 'production' ? null : err.stack || null

  req.url = '/error';
  res.status(status)
  res.locals.data = {
    ErrorStore: {
      status,
      message,
      stack,
    },
  }

  next()
};
