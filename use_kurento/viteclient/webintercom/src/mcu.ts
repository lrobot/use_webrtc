




// let client = mqtt.connect("mqtt://test.mosquitto.org"); // create a client


import { Call }	from "./call";

var videoInput: HTMLElement|null;
var videoOutput: HTMLElement|null;


const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

var state = I_CAN_START;





window.onload = function() {
	//console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
}

window.onbeforeunload = ()=>{
	console.log('Window closed ...');
};

var call:Call|null = null;

export function IntercomJoin(meetingId:string) {
	if(call) {
		call.callLeave();
	}
	call = new Call(meetingId);
	call.callJoin();
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
