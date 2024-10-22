
import { MqttClient } from './mqtt';

import * as constutil from './constutil';

import { appConfig } from './appconfig';

export interface CallReq {
    type : string;
    reqId: string;
    meetingType : string;
    meetingId : string;
    callId : string;
    userId : string;
}


class ReqTrans {
    topic: string|undefined;
    req: CallReq|undefined;
    resolve: any;
    reject: any;
}

interface CallResp {
    type : string;
    forType : string;
    reqId: string;
    code : number;
    codeMsg : string;
}

export class CallUser {
    username: string;
    mqttclient: MqttClient;
    reqTransMap : Map<string, ReqTrans> = new Map();
    callIdReqFnMap : Map<string, (req: CallReq)=>void> = new Map();
    constructor(username:string, mqttclient: MqttClient|null) {
        this.username = username;
        if(mqttclient) {
            this.mqttclient = mqttclient
        } else {
            this.mqttclient = new MqttClient();
        }
        this.mqttclient.addUser(username, this.onMessage.bind(this));
    }
    release() {
        // this.mqttclient.removeUser(this.username);
    }
    logStr() {
        return `CallUser(${this.username})`;
    }
    _publishJson(topic:string, message:any) {
        this.mqttclient.publishJson(topic, message);
    }
    onMessage(message:string) {
        try {
            const jsonMsg = JSON.parse(message);            
            if(!appConfig.logIce&&(jsonMsg.type=="callIce"||jsonMsg.forType=="callIce"||jsonMsg.type=="callVideoIce"||jsonMsg.forType=="callVideoIce")) {
                // no log ice
            } else {
                if(appConfig.logMqtt) {
                    console.log("mqtt_in_ ",this.username, message);
                }
            }
            if(jsonMsg.type) {
                if(jsonMsg.type=="response"){
                    if(jsonMsg.needAck) {
                        this.sendAck(jsonMsg.reqId);
                    }
                    this.onResponse(jsonMsg as CallResp);
                } else {
                    this.onRequest(jsonMsg as CallReq);
                }    
            } else {
                console.log(this.logStr(), "on no type Message", message);
            }
        } catch (error) {
            console.error(this.logStr(), "onMessage", error, message);   
        }
    }
    setCallIdReqFn(callId:string, fn:(req: CallReq)=>void) {
        this.callIdReqFnMap.set(callId, fn);
    }
    removeCallReqFn(callId:string) {
        this.callIdReqFnMap.delete(callId);
    }
    onRequest(req: CallReq) {
        this.sendResp(req.reqId, req.type, 200, "ok");
        const fn = this.callIdReqFnMap.get(req.callId);
        if(fn) {
            fn(req);
        } else {
            console.error(this.logStr(), "onRequest", "no callIdReqFn", req.callId);
        }
    }
    onResponse(resp: CallResp) {
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

    sendReqToUser(username:string, req: CallReq) {
        const userTopic = constutil.getUserTopic(username);
        this._publishJson(userTopic, req);
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
                    this._publishJson(userTopic, req);
                }
            }, 3*1000);
        });
    }
    sendResp(reqId: string, forType:string, code: number, codeMsg: string) {
        this._publishJson(appConfig.topicMeetingService, {
            type: "response",
            forType,
            reqId,
            code,
            codeMsg
        });
    }
    sendAck(reqId: string) {
        this._publishJson(appConfig.topicMeetingService, {
            type: "ack",
            reqId
        });
    }
    sendRespToUser(username:string, reqId: string, forType:string, code: number, codeMsg: string) {
        this._publishJson(constutil.getUserTopic(username), {
            type: "response",
            forType,
            reqId,
            code,
            codeMsg
        });
    }
    sendReq(req: CallReq):Promise<any> {
        this._publishJson(appConfig.topicMeetingService, req);
        return new Promise((resolve, reject) => {
            this.reqTransMap.set(req.reqId, {topic:appConfig.topicMeetingService, req, resolve, reject});
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
                    this._publishJson(appConfig.topicMeetingService, req);
                }
            }, 3*1000);
        });
    }
}