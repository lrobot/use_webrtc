


import { MeetingReq } from "./mqtt";
import { mqttClient } from "./sys";
import { appSys } from "./sys";
import { WrtcClient } from "./wrtc";
import { makeid } from "./util";
import { KurentoClient } from "./kurento";




export class Call {
    wrtcClient = new WrtcClient();
    // wrtcClient = new KurentoClient();
    meetingId: string;
    callId = makeid();
    constructor(meetingId:string) {
        this.meetingId = meetingId;
        this.wrtcClient.setFnOnIceCandidate(this.onLocalIceCandidate.bind(this));
        mqttClient.setMeetingReqFn(meetingId, this.onMeetingReq.bind(this));
    }
    release() {
        mqttClient.removeMeetingReqFn(this.meetingId);
    }
    async callJoin() {
        const offerSdp = await this.wrtcClient.createOffer();
        console.log("call_join");
        const response = await mqttClient.sendReq({
            reqId: makeid(),
            type: "call_join",
            meetingId: this.meetingId,
            callId: this.callId,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            sdp_offer: offerSdp
        } as any);
        if(response&&response.code==200) {
            console.log("call_join success");
            await this.wrtcClient.setAnswer(response.sdpAnswer);
            await this.wrtcClient.micCtrl(false);
        }
    }

    onMeetingReq(req: MeetingReq) {
        switch(req.type) {
            case "call_ice":
                this.wrtcClient.AddIceCandidate((req as any).ice);
                break;
            case "intercom_status":
                console.log("intercom_status", req);
                break;
        }
    }
    async speechCtrl(force:boolean, speech_on:boolean) {
        console.log("speech_ctrl");
        const response = await mqttClient.sendReq({
            reqId: makeid(),
            type: "intercom_speechctrl",
            meetingId: this.meetingId,
            callId: this.callId,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            force: force,
            speech_on,
            user_speech_level: 1
        } as any);
        if(response&&response.code==200) {
            console.log("speech_ctrl success");
            this.wrtcClient.micCtrl(speech_on);
        } else {
            console.log("speech_ctrl failed");
        }
    }

    async callLeave() {
        console.log("call_leave");
        mqttClient.sendReq({
            reqId: makeid(),
            type: "call_leave",
            meetingId: this.meetingId,
            callId: this.callId,
            user_id: appSys.user_id,
            meeting_type: "intercom"
        } as any);
    }

    onLocalIceCandidate(candidate:any) {
        console.log("local candidate", candidate);
        const candidateJson = JSON.parse(JSON.stringify(candidate));
        if(!candidateJson) {
            console.error("candidateJson is null");
            return;
        }
        candidateJson.sdp = candidateJson.candidate;
        console.log("local candidateJson", candidateJson);
        mqttClient.sendReq({
            reqId: makeid(),
            type: "call_ice",
            meetingId: this.meetingId,
            callId: this.callId,
            user_id: appSys.user_id,
            meeting_type: "intercom",
            ice: candidateJson
        } as any);
    }

}