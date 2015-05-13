![wordmark](static/images/wordmark.png)

###Free peer-to-peer file transfers in your browser

Cooked up by [Alex Kern](http://kern.io) & [Neeraj Baid](http://neeraj.io) while eating *Sliver* @ UC Berkeley.

![XKCD 949](http://imgs.xkcd.com/comics/file_transfer.png)

## Overview

FilePizza enables private and much faster P2P file transfer over the web.

By using web protocol [WebRTC](http://www.webrtc.org), we eliminate the slow and costly initial upload step traditionally required when sharing files via Dropbox/CloudApp/etc. For most files, this is a big deal. Instead of first sending the file to an external server, the sender immediately gets a link they can distribute. And when a recipient clicks it, they connect directly to the sender’s computer to complete the download, eliminating the server middleman. Because the file is never actually saved on, or even touches, our servers, the transfer is incredibly private and secure.

## Usage

    $ npm install
    $ npm start

## License

BSD
