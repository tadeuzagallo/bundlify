# Bundlify

For those who don't like the extra code of browserify, bundlify will
simply wrap your modules, with Module Pattern, and put them all on the same
file, but it _will not_ read external libraries!

## Installation

    $ npm install bundlify


## Usage

    $ bundlify entry_point.js


### Options

You can translate the name of the libraries to load it from the browser, e.g.

    $ bundlify index.js bluebird:Promise > bundle.js


```js
// index.js

var bluebird  = require('bluebird');
```

Will be translated to:

```js
// bundle.js

var bluebird = this.Promise; // this will always be the global scope
```


You can also export your entry module

    $ bundlify onionskin.js :OnionSkin > dist/onionskin.js

Will put the export of the file `onionskin.js` on the global variable `OnionSkin`

