


import { mqttClient, MeetingReq } from "./mqtt";
import { KurentoClient } from "./kurento";
import { makeid } from "./util";


class AppSys {
    user_id : string;
    constructor(user_id:string) {
        this.user_id = user_id;
    }
}

export const appSys = new AppSys("0604005");

export class Call {
    kuernetoClient = new KurentoClient();
    meeting_id: string;
    call_id = makeid();
    constructor(meeting_id:string) {
        this.meeting_id = meeting_id;
        this.kuernetoClient.setFnOnIceCandidate(this.onLocalIceCandidate.bind(this));
        mqttClient.setMeetingReqFn(meeting_id, this.onMeetingReq.bind(this));
    }
    release() {
        mqttClient.removeMeetingReqFn(this.meeting_id);
    }
    async callJoin() {
        const sdpOffer = await this.kuernetoClient.createOffer();
        console.log("call_join");
        const response = await mqttClient.sendReq({
            req_id: makeid(),
            type: "call_join",
            meeting_id: this.meeting_id,
            call_id: this.call_id,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            sdp_offer: sdpOffer
        } as any);
        if(response&&response.code==200) {
            console.log("call_join success");
            await this.kuernetoClient.setAnwer(response.sdp_answer);
            await this.kuernetoClient.micCtrl(false);
        }
    }

    onMeetingReq(req: MeetingReq) {
        switch(req.type) {
            case "call_ice":
                this.kuernetoClient.AddIceCandidate((req as any).ice);
                break;
            case "intercom_status":
                console.log("intercom_status", req);
                break;
        }
    }
    async speechCtrl(force:boolean, speech_on:boolean) {
        console.log("speech_ctrl");
        const response = await mqttClient.sendReq({
            req_id: makeid(),
            type: "intercom_speechctrl",
            meeting_id: this.meeting_id,
            call_id: this.call_id,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            force: force,
            speech_on,
            user_speech_level: 1
        } as any);
        if(response&&response.code==200) {
            console.log("speech_ctrl success");
            this.kuernetoClient.micCtrl(speech_on);
        } else {
            console.log("speech_ctrl failed");
        }
    }

    async callLeave() {
        console.log("call_leave");
        mqttClient.sendReq({
            req_id: makeid(),
            type: "call_leave",
            meeting_id: this.meeting_id,
            call_id: this.call_id,
            user_id: appSys.user_id,
            meeting_type: "intercom"
        } as any);
    }

    onLocalIceCandidate(candidate:any) {
        const candidateJson = JSON.parse(JSON.stringify(candidate));
        candidateJson.sdp = candidateJson.candidate;
        console.log("local candidate", candidate);
        mqttClient.sendReq({
            req_id: makeid(),
            type: "call_ice",
            meeting_id: this.meeting_id,
            call_id: this.call_id,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            ice: candidateJson
        } as any);
    }

}