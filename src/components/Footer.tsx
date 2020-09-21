import React from 'react'

export const Footer: React.FC = () => (
  <footer className="footer">
    <p>
      <strong>Like FilePizza?</strong> Support its development!{' '}
      <a
        href="https://commerce.coinbase.com/checkout/247b6ffe-fb4e-47a8-9a76-e6b7ef83ea22"
        className="donate-button"
      >
        donate
      </a>
    </p>

    <p className="byline">
      Cooked up by{' '}
      <a href="http://kern.io" target="_blank">
        Alex Kern
      </a>{' '}
      &amp;{' '}
      <a href="http://neeraj.io" target="_blank">
        Neeraj Baid
      </a>{' '}
      while eating <strong>Sliver</strong> @ UC Berkeley &middot;{' '}
      <a href="https://github.com/kern/filepizza#faq" target="_blank">
        FAQ
      </a>{' '}
      &middot;{' '}
      <a href="https://github.com/kern/filepizza" target="_blank">
        Fork us
      </a>
    </p>
  </footer>
)

export default Footer
