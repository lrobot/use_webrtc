


import mqtt from "mqtt"; // import namespace "mqtt"
import { makeid } from "./util";
export const mqttUrl = 'wss://mqtt.zhddkuma/mq/mqtt';
// export const mqttUrl = 'wss://srv.rbat.tk:8081';

const TopicMeetingService = "meeting/service";

export interface MeetingReq {
    type : string;
    reqId: string;
    meeting_type : string;
    meetingId : string;
    callId : string;
    user_id : string;
}


class ReqTrans {
    topic: string|undefined;
    req: MeetingReq|undefined;
    resolve: any;
    reject: any;
}

interface MeetingResp {
    type : string;
    forType : string;
    reqId: string;
    code : number;
    codeMsg : string;
}

export class MqttClient {
    client: mqtt.MqttClient;
    username : string;
    userTopic : string;
    reqTransMap : Map<string, ReqTrans> = new Map();
    meeingReqFnMap : Map<string, (req: MeetingReq)=>void> = new Map();
    constructor(username:string) {
        this.username = username;
        this.userTopic = "user/"+username;
        console.log("mqttUrl", mqttUrl);
        this.client = mqtt.connect(mqttUrl); // create a client
        this.client.on("message", (topic, message) => {
            console.log("mqtt_in_ ",topic, message.toString());
            this.onMessage(topic,message.toString())
        });
        this.client.on("connect", () => {
            console.log("mqtt_connect ok", mqttUrl);
            this.client.subscribe(this.userTopic, (err) => {
              if (!err) {
                this.clientPublish(this.userTopic, JSON.stringify({ message: "Hello from mqtt" }));
              }
            });
          })
        this.client.on("error", (err) => {
            console.log("mqtt_error", mqttUrl, err);
        });
        this.client.on("disconnect", () => {
            console.log("mqtt_disconnect", mqttUrl);
        });
    }
    clientPublish(topic:string, message:string) {
        console.log("mqtt_out_", topic, message);
        this.client.publish(topic, message);
    }

    getUserTopic(username:string) {
        return "user/" + username;
    }
    onMessage(topic:string, message:string) {
        const jsonMsg = JSON.parse(message);
        if(jsonMsg.type=="response"){
            this.onResponse(jsonMsg as MeetingResp);
        } else {
            this.onRequest(jsonMsg as MeetingReq);
        }
    }
    setMeetingReqFn(meetingId:string, fn:(req: MeetingReq)=>void) {
        this.meeingReqFnMap.set(meetingId, fn);
    }
    removeMeetingReqFn(meetingId:string) {
        this.meeingReqFnMap.delete(meetingId);
    }
    onRequest(req: MeetingReq) {
        this.sendResp(req.reqId, req.type, 200, "ok");
        const fn = this.meeingReqFnMap.get(req.meetingId);
        if(fn) {
            fn(req);
        }
    }
    onResponse(resp: MeetingResp) {
        if((resp as any).need_ack) {
            this.sendAck(resp.reqId);
        }
       const reqTrans = this.reqTransMap.get(resp.reqId);
       if(reqTrans) {
              reqTrans.resolve(resp);
       }
       if(resp.code>=200) {
           this.reqTransMap.delete(resp.reqId);
       }
    }

    sendReqToUser(username:string, req: MeetingReq) {
        const userTopic = this.getUserTopic(username);
        this.clientPublish(userTopic, JSON.stringify(req));
        return new Promise((resolve, reject) => {
            this.reqTransMap.set(req.reqId, {topic:userTopic ,req, resolve, reject});
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.reqId);
                if(reqTrans) {
                    reqTrans.reject("timeout");
                    this.reqTransMap.delete(req.reqId);
                }
            }, 10*1000);
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.reqId);
                if(reqTrans) {
                    this.clientPublish(userTopic, JSON.stringify(req));
                }
            }, 3*1000);
        });
    }
    sendResp(reqId: string, forType:string, code: number, codeMsg: string) {
        this.clientPublish(TopicMeetingService, JSON.stringify({
            type: "response",
            forType,
            reqId,
            code,
            codeMsg
        }));
    }
    sendAck(reqId: string) {
        this.clientPublish(TopicMeetingService, JSON.stringify({
            type: "ack",
            reqId
        }));
    }
    sendRespToUser(username:string, reqId: string, forType:string, code: number, codeMsg: string) {
        this.clientPublish(this.getUserTopic(username), JSON.stringify({
            type: "response",
            forType,
            reqId,
            code,
            codeMsg
        }));
    }
    sendReq(req: MeetingReq):Promise<any> {
        this.clientPublish(TopicMeetingService, JSON.stringify(req));
        return new Promise((resolve, reject) => {
            this.reqTransMap.set(req.reqId, {topic:TopicMeetingService, req, resolve, reject});
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.reqId);
                if(reqTrans) {
                    reqTrans.reject("timeout");
                    this.reqTransMap.delete(req.reqId);
                }
            }, 10*1000);
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.reqId);
                if(reqTrans) {
                    this.clientPublish(TopicMeetingService, JSON.stringify(req));
                }
            }, 3*1000);
        });
    }
}



