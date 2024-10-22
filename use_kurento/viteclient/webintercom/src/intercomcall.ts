import { Call } from "./call";
import { CallUser } from "./calluser";
import { mqttClient } from "./mqtt";


export class IntercomAutoCall {
    callUser:CallUser;
    call: Call;
    meetingId: string;
    fnOnStatusUpdate: (status: string) => void = () => {};
    constructor(username:string, meetingId:string) {
        this.meetingId = meetingId;
        this.callUser = new CallUser(username, mqttClient);
        this.call = new Call(this.callUser, this.meetingId);
        this.callRecreate();
    }
    async callJoin(audioElem:HTMLAudioElement) {
        await this.call.callJoin(audioElem);
    }
    async callRestart(audioElem:HTMLAudioElement) {
        await this.callRecreate();
        return await this.callJoin(audioElem);
    }
    onStatusUpdate(fn: (status: string) => void) {
        this.fnOnStatusUpdate = fn;
        this.call.onStatusUpdate(this.fnOnStatusUpdate);
    }
    speechCtrl(speechOn:boolean) {
        this.call.speechCtrl(false, speechOn);
    }
    setSpeakerOn(speakerOn:boolean) {
        this.call.setSpeakerOn(speakerOn);
    }
    async callLeave() {
        await this.call.callLeave();
    }
    async callRecreate() {
        console.log("callRecreate", this.call.logStr());
        await this.call.release();
        this.call = new Call(this.callUser, this.meetingId);
        this.call.onStatusUpdate(this.fnOnStatusUpdate);
        // this.callUser.release();
    }
}
