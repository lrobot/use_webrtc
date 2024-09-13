var path = require('path');
var url = require('url');
var cookieParser = require('cookie-parser');
var express = require('express');
var session = require('express-session')
var minimist = require('minimist');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');

var argv = minimist(process.argv.slice(2), {
  default: {
      as_uri: 'https://localhost:8443/',    // Kurento Application IP
      ws_uri: 'ws://localhost:8888/kurento'    // Kurento Server IP
  }
});

var options =
{
key:  fs.readFileSync('keys/server.key'),
cert: fs.readFileSync('keys/server.crt')
};

var app = express();

/*
* Management of sessions
*/
app.use(cookieParser());

var sessionHandler = session({
  secret : 'none',
  rolling : true,
  resave : true,
  saveUninitialized : true
});

app.use(sessionHandler);



/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = https.createServer(options, app).listen(port, function() {
    console.log('Kurento Tutorial started');
    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});

app.use(express.static(path.join(__dirname, 'static')));


exports.ws_uri = argv.ws_uri
exports.server = server;
exports.app = app;
exports.sessionHandler = sessionHandler;


