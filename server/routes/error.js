module.exports = function (err, req, res, next) {

  var status = err.status || 500
  var message = err.message || ''

  req.url = '/error'
  res.status(status)
  res.locals.data = {
    ErrorStore: {
      status: status,
      message: message
    }
  }

  next()

}
