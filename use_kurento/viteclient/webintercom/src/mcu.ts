




// let client = mqtt.connect("mqtt://test.mosquitto.org"); // create a client


import { Call }	from "./call";
import { IntercomAutoCall } from "./intercomcall";

var videoInput: HTMLElement|null;
var videoOutput: HTMLElement|null;
var audioElem: HTMLAudioElement|null;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

var state = I_CAN_START;





window.onload = function() {
	//console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
	audioElem = document.getElementById('audio') as HTMLAudioElement;
}

window.onbeforeunload = ()=>{
	console.log('Window closed ...');
};

var call:IntercomAutoCall|null = null;

export function IntercomJoin(meetingId:string) {
	if(call) {
		call.callLeave();
	}
	call = new IntercomAutoCall("testuser1", meetingId);
	if(audioElem) {
		call.callJoin(audioElem);
	}
}


export function IntercomLeave() {
	if(call) {
		call.callLeave();
	}
}

export function speechCtrlOn() {
	if(call) {
		call.speechCtrl(false, true);
	}
}
export function speechCtrlOff() {
	if(call) {
		call.speechCtrl(false, false);
	}
}
