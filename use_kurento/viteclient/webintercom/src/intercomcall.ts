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
    onStatusUpdate(fn: (status: string) => void) {
        this.call.onStatusUpdate(fn);
    }
    callLeave() {
        this.call.callLeave();
    }
    release() {
        this.call.release();
        this.callUser.release();
    }
}
