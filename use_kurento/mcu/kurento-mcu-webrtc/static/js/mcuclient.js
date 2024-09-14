/*
 * (C) Copyright 2014-2017 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

var webRtcPeer = null;
var offerGenDone = false;
var ws = connectWs()

function connectWs() {
	var wsUrl = 'wss://' + location.host + '/kurentomcu';
	console.log('Connecting to wesocket:' + wsUrl);
	var websocket = new WebSocket(wsUrl);
	websocket.onclose = function() {
		setTimeout(function() {
      ws = connectWs();
    }, 1000);
	}
	websocket.onopen = function() {
		console.log('Wesocket connected');
		if(webRtcPeer==null) {
			setState(I_CAN_START);
			start();
		}
	}
	websocket.onerror = function(error) {
		console.log('wesocket error:', error);
	}

	websocket.onmessage = function(message) {
		var parsedMessage = JSON.parse(message.data);
		// console.info('Received message: ' + message.data);
	
		switch (parsedMessage.id) {
		case 'startResponse':
			startResponse(parsedMessage);
			break;
		case 'error':
			if (state == I_AM_STARTING) {
				setState(I_CAN_START);
			}
			onError('Error message from server: ' + parsedMessage.message);
			break;
		case 'iceCandidate':
			webRtcPeer.addIceCandidate(parsedMessage.candidate)
			break;
		default:
			if (state == I_AM_STARTING) {
				setState(I_CAN_START);
			}
			onError('Unrecognized message', parsedMessage);
		}
	}
	
	return websocket;
}
var videoInput;
var videoOutput;

var state = null;
const ENABLE_VIDEO = false;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

window.onload = function() {
	//console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
}

window.onbeforeunload = function() {
	ws.close();
}


function start() {
	console.log('Starting video call ...')

	// Disable start button
	setState(I_AM_STARTING);
	//showSpinner(videoInput, videoOutput);

	console.log('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
      localVideo: videoInput,
      remoteVideo: videoOutput,
      onicecandidate : onIceCandidate,
			mediaConstraints: {
				audio: true,
				video: ENABLE_VIDEO?{
					width: 320,
					height: 240
				}:false
			}
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
        if(error) return onError(error);
        // this.generateOffer(onOffer);
    });
	webRtcPeer.peerConnection.onnegotiationneeded = function() {
		console.log('onnegotiationneeded');
		// webRtcPeer.peerConnection.restartIce();
		if(offerGenDone) {
			// webRtcPeer.generateOffer(()=>{});
		} else {
			webRtcPeer.generateOffer(onOffer);
			offerGenDone = true;
		}

	}
	webRtcPeer.peerConnection.oniceconnectionstatechange = function(event) {
		console.log('oniceconnectionstatechange:', event.target.iceConnectionState, event);
		if(event.target.iceConnectionState == 'disconnected'|| event.target.iceConnectionState == 'failed') {
			console.log('Restart ice');
			webRtcPeer.peerConnection.restartIce();
			// webRtcPeer.generateOffer(onOffer);
		}
	}
}

function onIceCandidate(candidate) {
	   console.log('Local candidate' + JSON.stringify(candidate));

	   var message = {
	      id : 'onIceCandidate',
	      candidate : candidate
	   };
	   sendMessage(message);
}

function onOffer(error, offerSdp) {
	if(error) return onError(error);

	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id : 'start',
		sdpOffer : offerSdp
	}
	sendMessage(message);
}

function onError(error) {
	console.error(error);
}

function startResponse(message) {
	setState(I_CAN_STOP);
	console.log('SDP answer received from server. Processing ...');
	webRtcPeer.processAnswer(message.sdpAnswer);
}

function stop() {
	console.log('Stopping video call ...');
	setState(I_CAN_START);
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;

		var message = {
			id : 'stop'
		}
		sendMessage(message);
	}
	//hideSpinner(videoInput, videoOutput);
}

function setState(nextState) {
	switch (nextState) {
	case I_CAN_START:
		/*$('#start').attr('disabled', false);
		$('#start').attr('onclick', 'start()');
		$('#stop').attr('disabled', true);
		$('#stop').removeAttr('onclick');*/
		break;

	case I_CAN_STOP:
		/*$('#start').attr('disabled', true);
		$('#stop').attr('disabled', false);
		$('#stop').attr('onclick', 'stop()');*/
		break;

	case I_AM_STARTING:
		/*$('#start').attr('disabled', true);
		$('#start').removeAttr('onclick');
		$('#stop').attr('disabled', true);
		$('#stop').removeAttr('onclick');*/
		break;

	default:
		onError('Unknown state ' + nextState);
		return;
	}
	state = nextState;
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}
