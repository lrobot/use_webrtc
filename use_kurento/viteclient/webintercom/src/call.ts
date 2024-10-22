


import { CallReq } from "./calluser";
import { WrtcClient } from "./wrtc";
import { makeid } from "./util";
// import { KurentoClient } from "./kurento";
import { CallUser } from "./calluser";




export class Call {
    wrtcClient = new WrtcClient();
    callUser:CallUser;
    // wrtcClient = new KurentoClient();
    meetingId: string;
    callId: string = "";
    callJoined = false;
    statusUpdateFn: (status: string) => void = (status: string) => {};
    constructor(callUser:CallUser, meetingId:string) {
        this.callUser = callUser;
        this.meetingId = meetingId;
        this.hookOn();
    }
    hookOff() {
        this.callUser.removeCallReqFn(this.callId);
        this.wrtcClient.setOnIceStateChange(()=>{});
        this.wrtcClient.setFnOnIceCandidate(()=>{});
    }
    hookOn() {
        this.callId = makeid();
        this.callUser.setCallIdReqFn(this.callId, this.onCallReq.bind(this));
        this.wrtcClient.setFnOnIceCandidate(this.onLocalIceCandidate.bind(this));
        this.wrtcClient.setOnIceStateChange((state:string) => {
            this.statusUpdateFn(state);
        });
    }
    async release() {
        this.hookOff();
        if(this.callJoined) {
            await this.callLeave();
        }
    }
    logStr() {
        return `Call(${this.callUser.logStr()}), meetingId:${this.meetingId}, callId:${this.callId}`;
    }
    onStatusUpdate(fn: (status: string) => void) {
        this.statusUpdateFn = fn;
    }
    async callRestart(audioElem:HTMLAudioElement) {
        this.hookOff();
        this.wrtcClient = new WrtcClient();
        this.hookOn();
        await this.callJoin(audioElem);
    }
    async callJoin(audioElem:HTMLAudioElement) {
        const offerSdp = await this.wrtcClient.createOffer(audioElem);
        this.statusUpdateFn("calling");
        console.log("callJoin:Offer", this.logStr(), offerSdp);
        this.callJoined = true;
        const response = await this.callUser.sendReq({
            reqId: makeid(),
            type: "callJoin",
            create: true,
            meetingId: this.meetingId,
            callId: this.callId,
            userId: this.callUser.username,
            meetingType: "intercom",
            sdpOffer: offerSdp
        } as any);
        if(response&&response.code==200) {
            this.statusUpdateFn("connected");
            console.log("callJoin:Answer", this.logStr(), offerSdp);
            await this.wrtcClient.setAnswer(response.sdpAnswer);
            await this.wrtcClient.micCtrl(false);
        }
    }

    onCallReq(req: CallReq) {
        switch(req.type) {
            case "callIce":
                this.wrtcClient.AddIceCandidate((req as any).ice);
                break;
            case "intercomStatus":
                console.log("intercomStatus", req);
                break;
        }
    }
    async speechCtrl(force:boolean, speechOn:boolean) {
        console.log("intercomSpeechCtrl");
        const response = await this.callUser.sendReq({
            reqId: makeid(),
            type: "intercomSpeechCtrl",
            meetingId: this.meetingId,
            callId: this.callId,
            userId: this.callUser.username,
            meetingType: "intercom",
            force: force,
            speechOn,
            userSpeechLevel: 1
        } as any);
        if(response&&response.code==200) {
            console.log("intercomSpeechCtrl success");
            this.wrtcClient.micCtrl(speechOn);
        } else {
            console.log("intercomSpeechCtrl failed");
        }
    }
    async setSpeakerOn(speakerOn:boolean) {
        this.wrtcClient.setSpeakerOn(speakerOn);
    }
    async callLeave() {
        console.log("callLeave");
        this._callLeave();
    }
    async _callLeave() {
        try {
            await this.callUser.sendReq({
                reqId: makeid(),
                type: "callLeave",
                meetingId: this.meetingId,
                callId: this.callId,
                userId: this.callUser.username,
                meetingType: "intercom"
            } as any);    
        } catch (error) {
            console.error("callLeave", error);
        }
    }

    async onLocalIceCandidate(candidate:any) {
        // console.log("local candidate", candidate);
        const candidateJson = JSON.parse(JSON.stringify(candidate));
        if(!candidateJson) {
            console.error("candidateJson is null");
            return;
        }
        candidateJson.sdp = candidateJson.candidate;
        // console.log("local candidateJson", candidateJson);
        try {
            await this.callUser.sendReq({
                reqId: makeid(),
                type: "callIce",
                meetingId: this.meetingId,
                callId: this.callId,
                userId: this.callUser.username,
                meetingType: "intercom",
                ice: candidateJson
            } as any);            
        } catch (error) {
            console.error(`onLocalIceCandidate:${this.logStr()}`, error);
        }
    }

}