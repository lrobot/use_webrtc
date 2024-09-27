
import { mqttClient } from "./mqtt";


export const mqttUrl = 'wss://yjdd.lm-t.cn/mq/mqtt';
// export const mqttUrl = 'mqtt://vhbw.rbat.tk';



// let client = mqtt.connect("mqtt://test.mosquitto.org"); // create a client


import { appSys, Call }	from "./call";

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

export function IntercomJoin(meeting_id:string) {
	if(call) {
		call.callLeave();
	}
	call = new Call(meeting_id);
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
