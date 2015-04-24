var React = require('react')
var ReactRouter = require('react-router')
var alt = require('../../client/alt')
var clientRoutes = require('../../client/routes')

function isNotFound(state) {
  for (var r of state.routes) {
    if (r.isNotFound) return true
  }

  return false
}

module.exports = function (req, res) {

  alt.bootstrap(JSON.stringify(res.locals.data || {}))

  ReactRouter.run(clientRoutes, req.url, function (Handler, state) {

    var html = React.renderToString(<Handler data={alt.takeSnapshot()} />)
    alt.flush()

    if (isNotFound(state)) res.status(404)
    res.write('<!DOCTYPE html>\n')
    res.end(html)

  })

}
