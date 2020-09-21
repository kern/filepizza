const React = require('react')
const ReactRouter = require('react-router')
const alt = require('../alt')
const routes = require('../routes')

function isNotFound(state) {
  for (const r of state.routes) {
    if (r.isNotFound) {
      return true
    }
  }

  return false
}

module.exports = function (req, res) {
  alt.bootstrap(JSON.stringify(res.locals.data || {}))

  ReactRouter.run(routes, req.url, (Handler, state) => {
    const html = React.renderToString(<Handler data={alt.takeSnapshot()} />)
    alt.flush()

    res.setHeader('Content-Type', 'text/html')
    if (isNotFound(state)) {
      res.status(404)
    }
    res.write('<!DOCTYPE html>\n')
    res.end(html)
  })
}
