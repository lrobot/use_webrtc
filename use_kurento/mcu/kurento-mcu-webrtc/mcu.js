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

var expweb = require('./expweb')

const kilo = 1024;

const BIT_RATE = 320; //kbps
/*
 * Definition of global variables.
 */
var sessions = {};
var candidatesQueue = {};
var kurentoClient = null;
var compositeHub = null;
var mediaPipeline = null;


const ENABLE_VIDEO = false;



var wss = new ws.Server({
    server : expweb.server,
    path : '/kurentomcu'
});

/*
 * Management of WebSocket messages
 */
wss.on('connection', function(ws, req) {
    var sessionId = null;
    var websocketId = null; // differ tabs
    var request = req;
    var response = {
        writeHead : {}
    };

    expweb.sessionHandler(request, response, function(err) {
        sessionId = request.session.id; //"sessionId";// 
        console.log('Connection received with sessionId ' + sessionId);
        // var websocketId = request.headers['sec-websocket-key'];
    });

    ws.on('error', function(error) {
        console.log('Connection ' + sessionId + ' error');
        stop(sessionId, websocketId);
    });

    ws.on('close', function() {
        console.log('Connection ' + sessionId + ' , ' + websocketId + ' closed');
        stop(sessionId, websocketId);
    });

    ws.on('message', function(_message) {
        var message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
        case 'start':
            sessionId = request.session.id;
            // sessionId = "sessionId";
            websocketId = request.headers['sec-websocket-key'];
            websocketId = "fixedWebsocketId";
            start(sessionId, websocketId, ws, message.sdpOffer, function(error, sdpAnswer) {
                if (error) {
                    console.log('Error in start:', error);
                    return ws.send(JSON.stringify({
                        id : 'error',
                        message : error
                    }));
                }
                ws.send(JSON.stringify({
                    id : 'startResponse',
                    sdpAnswer : sdpAnswer
                }));
            });
            break;

        case 'stop':
            stop(sessionId, websocketId);
            break;

        case 'onIceCandidate':
            onIceCandidate(sessionId, websocketId, message.candidate);
            break;

        default:
            ws.send(JSON.stringify({
                id : 'error',
                message : 'Invalid message ' + _message
            }));
            break;
        }

    });
});

/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }
    var kurento_url = expweb.ws_uri;
    console.log("connecting to kurento:", kurento_url)
    kurento(kurento_url, function(error, _kurentoClient) {
        console.log("connect done to kurento:", kurento_url, error, _kurentoClient)
        if (error) {
            console.log("Could not find media server at address " + kurento_url);
            return callback("Could not find media server at address" + kurento_url
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function getMediaPipeline(callback) {
  if (mediaPipeline) {
    return callback(null, mediaPipeline);
  } else {
    kurentoClient.create('MediaPipeline', function(error, pipeline) {
        if (error) {
            return callback(error);
        }
        console.log('Creating MediaPipeline and Composite...');
        pipeline.listeners = 0;
        mediaPipeline = pipeline;
        return callback(null,pipeline);
    });
  }
}

function restart(sessionId, websocketId, session, ws, sdpOffer, callback) {
    console.log('Restarting user in MCU [ ' + sessionId + ', '  +  websocketId + ' ]');
    var pipeline = session.pipeline;
    var webRtcEndpoint = session.webRtcEndpoint;
    var hubPort = session.hubPort;
    webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
      if (error) {
        return callback(error);
      }
      return callback(null, sdpAnswer);
    });

    webRtcEndpoint.gatherCandidates(function(error) {
      if (error) {
        return callback(error);
      }
    });
}

function start(sessionId, websocketId, ws, sdpOffer, callback) {
    if (!sessionId || !websocketId) {
        return callback('Cannot use undefined sessionId/websocketId');
    }

    if(sessions[sessionId] && sessions[sessionId][websocketId]) {
      var existSession = sessions[sessionId][websocketId];
      if (existSession && existSession.webRtcEndpoint) {
          restart(sessionId, websocketId, existSession, ws, sdpOffer, callback);
          return;
      }
    }

    console.log('Adding user to MCU [ ' + sessionId + ', '  +  websocketId + ' ]');
    getKurentoClient(function(error, kurentoClient) {
        if (error) {
            return callback(error);
        }

        getMediaPipeline( function(error, pipeline) {
            if (error) {
                return callback(error);
            }

            pipeline.listeners++;

            createMediaElements(pipeline, ws, function(error, webRtcEndpoint,
              hubPort) {
                if (error) {
                    pipeline.release();
                    return callback(error);
                }

                if (candidatesQueue[sessionId] && candidatesQueue[sessionId][websocketId]) {
                    while(candidatesQueue[sessionId][websocketId].length) {
                        var candidate = candidatesQueue[sessionId][websocketId].shift();
                        webRtcEndpoint.addIceCandidate(candidate);
                    }
                }

                connectMediaElements(webRtcEndpoint, hubPort,
                  function(error) {
                    if (error) {
                        pipeline.release();
                        return callback(error);
                    }

                    webRtcEndpoint.on('IceCandidateFound', function(event) {
                        var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                        ws.send(JSON.stringify({
                            id : 'iceCandidate',
                            candidate : candidate
                        }));
                        ws.send(JSON.stringify({
                            id : 'iceCandidate',
                            candidate : candidate
                        }));
                    });

                    webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
                        if (error) {
                            pipeline.release();
                            return callback(error);
                        }

                        if (!sessions[sessionId]) {
                          sessions[sessionId] = {};
                        }
                        sessions[sessionId][websocketId] = {
                            'pipeline' : pipeline,
                            'webRtcEndpoint' : webRtcEndpoint,
                            'hubPort' : hubPort
                        }
                        return callback(null, sdpAnswer);
                    });

                    webRtcEndpoint.gatherCandidates(function(error) {
                        if (error) {
                            return callback(error);
                        }
                    });
                });
            });
        });
    });
}

function createMediaElements(pipeline, ws, callback) {
      pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
          if (error) {
              return callback(error);
          }
          var maxbps = Math.floor( BIT_RATE * kilo);
          webRtcEndpoint.setMinEncoderBitrate(maxbps, function (error) {
              //console.log('[media] Min Output Bitrate (bps) ' + maxbps);
              if (error) {
                console.log('[media]  Error: ' + error);
              }
              webRtcEndpoint.setMaxEncoderBitrate(maxbps, function (error) {
                //console.log('[media] Min Output Bitrate (bps) ' + maxbps);
                if (error) {
                  console.log('[media]  Error: ' + error);
                }
                if (compositeHub) {
                  compositeHub.createHubPort(function(error, hubPort){
                    if (error){
                      return callback(error);
                    }
                    hubPort.setMinEncoderBitrate(maxbps, function (error) {
                      hubPort.setMaxEncoderBitrate(maxbps, function (error){
                        return callback(null, webRtcEndpoint, hubPort);
                      });
                    });
                  });
                }
                else
                {
                  pipeline.create('Composite', function (error, composite) {
                    if (error) {
                      return callback(error);
                    }

                    compositeHub = composite;

                    if (ENABLE_VIDEO && !compositeHub.outputVideoPort) {
                      compositeHub.createHubPort(function(error, _outputVideoPort){
                        if (error){
                          return callback(error);
                        }

                        compositeHub.outputVideoPort = _outputVideoPort;
                        _outputVideoPort.setMinEncoderBitrate(maxbps, function (error) {
                          _outputVideoPort.setMaxEncoderBitrate(maxbps, function (error){

                            composite.createHubPort(function(error, hubPort){
                              if (error){
                                return callback(error);
                              }
                              hubPort.setMinEncoderBitrate(maxbps, function (error) {
                                hubPort.setMaxEncoderBitrate(maxbps, function (error){
                                  return callback(null, webRtcEndpoint, hubPort);
                                });
                              });
                            });
                        });
                      });
                    });
                  } else {
                    composite.createHubPort(function(error, hubPort){
                      if (error){
                        return callback(error);
                      }
                      hubPort.setMinEncoderBitrate(maxbps, function (error) {
                        hubPort.setMaxEncoderBitrate(maxbps, function (error){
                          return callback(null, webRtcEndpoint, hubPort);
                        });
                      });
                    });
                  }
                });
              }
            });
        });
    });
}

function connectMediaElements(webRtcEndpoint, hubPort, callback) {
    webRtcEndpoint.connect(hubPort, function(error) {
        if (error) {
            return callback(error);
        }

        if (compositeHub) {
          hubPort.connect(webRtcEndpoint, 'AUDIO', function (error){
            if (error) {
              return callback(error);
            }
            return callback(null);
          });
          if(ENABLE_VIDEO && compositeHub.outputVideoPort) {
            compositeHub.outputVideoPort.connect(webRtcEndpoint, 'VIDEO', function (error){
              if (error) {
                return callback(error);
              }
            });
          }  
        }
    });
}

function stop(sessionId, websocketId) {
    if (sessions[sessionId] && sessions[sessionId][websocketId]) {
        console.log('Removing user from MCU [ ' + sessionId + ', '  +  websocketId + ' ]');
        // var pipeline = sessions[sessionId].pipeline;
        // console.info('Releasing pipeline');
        // pipeline.release();

        var hubPort = sessions[sessionId][websocketId].hubPort;
        var webRtcEndpoint = sessions[sessionId][websocketId].webRtcEndpoint;
        if (hubPort) {
          hubPort.release(function (error) {
            if (webRtcEndpoint) {
              webRtcEndpoint.release();
            }

            delete sessions[sessionId][websocketId];
            if(candidatesQueue[sessionId]) {
              delete candidatesQueue[sessionId][websocketId];
            }
            delete candidatesQueue[sessionId]
            if (mediaPipeline) {
              mediaPipeline.listeners--;
              if (mediaPipeline.listeners < 1) {
                mediaPipeline.release();
                mediaPipeline = null;
                compositeHub = null;
                console.log('Removing MediaPipeline and Composite...');
              }
            }
          });
        }
    }
}

process.on('SIGINT', function (error, signal){
  console.log('Stopping application...');
  if (mediaPipeline) {
    console.log('Removing MediaPipeline and Composite...');
    mediaPipeline.release(function (error) {
      exit();
    });
  } else {
    exit();
  }
});

function exit() {
  console.log('Bye!');
  process.exit();
}

function onIceCandidate(sessionId, websocketId, _candidate) {
    var candidate = kurento.register.complexTypes.IceCandidate(_candidate);

    if (sessions[sessionId] && sessions[sessionId][websocketId]) {
        //console.info('Sending candidate');
        var webRtcEndpoint = sessions[sessionId][websocketId].webRtcEndpoint;
        webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        //console.info('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
          candidatesQueue[sessionId] = {};
          candidatesQueue[sessionId][websocketId] = [];
        } else {
          if (!candidatesQueue[sessionId][websocketId]) {
            candidatesQueue[sessionId][websocketId] = [];
          }
        }
        candidatesQueue[sessionId][websocketId].push(candidate);
    }
}