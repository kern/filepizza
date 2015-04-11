import React from 'react'
import ReactRouter from 'react-router'
import routes from './routes'
import alt from './alt'

let bootstrap = document.documentElement.getAttribute('data-bootstrap')
alt.bootstrap(bootstrap)

ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
  React.render(<Handler data={bootstrap} />, document)
})
