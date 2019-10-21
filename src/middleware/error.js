module.exports = function (err, req, res, next) {

  var status = err.status || 500
  var message = err.message || ''
  var stack = process.env.NODE_ENV === 'production' ? null : err.stack || null

  req.url = '/error'
  res.status(status)
  res.locals.data = {
    ErrorStore: {
      status: status,
      message: message,
      stack: stack
    }
  }

  next()

}
