import { Call } from "./call";
import { CallUser } from "./calluser";
import { mqttClient } from "./mqtt";


export class IntercomAutoCall {
    callUser:CallUser;
    call: Call;
    constructor(username:string, meetingId:string) {
        this.callUser = new CallUser(username, mqttClient);
        this.call = new Call(this.callUser, meetingId);
    }
    callJoin(audioElem:HTMLAudioElement) {
        this.call.callJoin(audioElem);
    }
    callRestart(audioElem:HTMLAudioElement) {
        return  this.call.callRestart(audioElem);
    }
    onStatusUpdate(fn: (status: string) => void) {
        this.call.onStatusUpdate(fn);
    }
    speechCtrl(speechOn:boolean) {
        this.call.speechCtrl(false, speechOn);
    }
    setSpeakerOn(speakerOn:boolean) {
        this.call.setSpeakerOn(speakerOn);
    }
    callLeave() {
        this.call.callLeave();
    }
    release() {
        console.log("IntercomAutoCall release", this.call.logStr());
        this.call.release();
        this.callUser.release();
    }
}
