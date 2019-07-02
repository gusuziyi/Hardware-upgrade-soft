import React, { Component } from 'react'
import { render } from 'react-dom'

require('./native.js')

import { createStore } from 'redux'
import { Provider } from 'react-redux'
import reducers from './redux/reducers/index.js'
const store = createStore(reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__())

setTimeout(
  function () {
    render(
      <Provider store={store}>
        <div className={spritesCss['icon-bg1']}>
          <Header />
          <Body />
          <Footer />
        </div>
      </Provider>,
      document.getElementById('app')
    )
  }, 1000
)
