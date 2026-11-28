import type QRCodeComponent from 'react-qr-code'

// The package's CommonJS build also exports the component by name, which
// survives bundler default-export interop; its typings only declare the default.
declare module 'react-qr-code' {
  export const QRCode: typeof QRCodeComponent
}
