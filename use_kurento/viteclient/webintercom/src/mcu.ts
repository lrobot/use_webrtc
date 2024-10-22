




// let client = mqtt.connect("mqtt://test.mosquitto.org"); // create a client


import { IntercomAutoCall } from "./intercomcall";

var videoInput: HTMLElement|null;
var videoOutput: HTMLElement|null;
var audioElem: HTMLAudioElement|null;




window.onload = function() {
	//console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
	audioElem = document.getElementById('audio') as HTMLAudioElement;
}

window.onbeforeunload = ()=>{
	console.log('Window closed ...', videoInput, videoOutput);
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
		call.speechCtrl(true);
	}
}
export function speechCtrlOff() {
	if(call) {
		call.speechCtrl(false);
	}
}
