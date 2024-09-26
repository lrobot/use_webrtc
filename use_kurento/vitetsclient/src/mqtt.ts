


import mqtt from "mqtt"; // import namespace "mqtt"
export const mqttUrl = 'wss://yjdd.lm-t.cn/mq/mqtt';

const TopicMeetingService = "meeting/service";

export interface MeetingReq {
    type : string;
    req_id: string;
    meeting_type : string;
    meeting_id : string;
    call_id : string;
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
    for_type : string;
    req_id: string;
    code : number;
    code_msg : string;
}

class MqttClient {
    client: mqtt.MqttClient;
    username : string;
    userTopic : string;
    reqTransMap : Map<string, ReqTrans> = new Map();
    meeingReqFnMap : Map<string, (req: MeetingReq)=>void> = new Map();
    constructor(username:string) {
        this.username = username;
        this.userTopic = "user/"+username;
        this.client = mqtt.connect(mqttUrl); // create a client
        this.client.on("message", (topic, message) => {
            console.log("mqtt_in_ ",topic, message.toString());
            this.onMessage(topic,message.toString())
        });
        this.client.on("connect", () => {
            this.client.subscribe(this.userTopic, (err) => {
              if (!err) {
                this.clientPublish(this.userTopic, JSON.stringify({ message: "Hello from mqtt" }));
              }
            });
          })
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
    setMeetingReqFn(meeting_id:string, fn:(req: MeetingReq)=>void) {
        this.meeingReqFnMap.set(meeting_id, fn);
    }
    removeMeetingReqFn(meeting_id:string) {
        this.meeingReqFnMap.delete(meeting_id);
    }
    onRequest(req: MeetingReq) {
        this.sendResp(req.req_id, req.type, 200, "ok");
        const fn = this.meeingReqFnMap.get(req.meeting_id);
        if(fn) {
            fn(req);
        }
    }
    onResponse(resp: MeetingResp) {
       const reqTrans = this.reqTransMap.get(resp.req_id);
       if(reqTrans) {
              reqTrans.resolve(resp);
       }
       if(resp.code>=200) {
           this.reqTransMap.delete(resp.req_id);
       }
    }

    sendReqToUser(username:string, req: MeetingReq) {
        const userTopic = this.getUserTopic(username);
        this.clientPublish(userTopic, JSON.stringify(req));
        return new Promise((resolve, reject) => {
            this.reqTransMap.set(req.req_id, {topic:userTopic ,req, resolve, reject});
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.req_id);
                if(reqTrans) {
                    reqTrans.reject("timeout");
                    this.reqTransMap.delete(req.req_id);
                }
            }, 10*1000);
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.req_id);
                if(reqTrans) {
                    this.clientPublish(userTopic, JSON.stringify(req));
                }
            }, 3*1000);
        });
    }
    sendResp(req_id: string, for_type:string, code: number, code_msg: string) {
        this.clientPublish(TopicMeetingService, JSON.stringify({
            type: "response",
            for_type,
            req_id,
            code,
            code_msg
        }));
    }
    sendRespToUser(username:string, req_id: string, for_type:string, code: number, code_msg: string) {
        this.clientPublish(this.getUserTopic(username), JSON.stringify({
            type: "response",
            for_type,
            req_id,
            code,
            code_msg
        }));
    }
    sendReq(req: MeetingReq):Promise<any> {
        this.clientPublish(TopicMeetingService, JSON.stringify(req));
        return new Promise((resolve, reject) => {
            this.reqTransMap.set(req.req_id, {topic:TopicMeetingService, req, resolve, reject});
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.req_id);
                if(reqTrans) {
                    reqTrans.reject("timeout");
                    this.reqTransMap.delete(req.req_id);
                }
            }, 10*1000);
            setTimeout(() => {
                const reqTrans = this.reqTransMap.get(req.req_id);
                if(reqTrans) {
                    this.clientPublish(TopicMeetingService, JSON.stringify(req));
                }
            }, 3*1000);
        });
    }
}


export const mqttClient = new MqttClient("0604005");
