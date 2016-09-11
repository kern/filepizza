var React = require('react')
var ReactRouter = require('react-router')
var alt = require('../alt')
var routes = require('../routes')

function isNotFound(state) {
  for (var r of state.routes) {
    if (r.isNotFound) return true
  }

  return false
}

module.exports = function (req, res) {

  alt.bootstrap(JSON.stringify(res.locals.data || {}))
  
  ReactRouter.run(routes, req.url, function (Handler, state) {
  
    var html = React.renderToString(<Handler data={alt.takeSnapshot()} />)
    alt.flush()
  
    res.setHeader('Content-Type', 'text/html');
    if (isNotFound(state)) res.status(404)
    res.write('<!DOCTYPE html>\n')
    res.end(html)
  
  })

}
