import QMqttClient from "./qmqtt";

import * as constdomain from "./constdomain";



interface MsgTran {
  retryCount:number
  topic:string
  json:any
  req_id:string
}


class MsgTrans {
  mqtt: QMqttClient
  trans: Map<string, MsgTran> = new Map<string, MsgTran>();
  constructor(mqtt: QMqttClient) {
    this.mqtt = mqtt
  }

  getUserTopic(userId: string):string {
    return constdomain.kMqttTopicUserPrefix + userId;
  }
  doPublish(topic: string, json:string) {
    console.log("m_ ot_:", topic, json);
    this.mqtt.publish(topic, json);
  }
  async _sendMsg(topic: string, json:any) {
    json.bus_type = constdomain.kBusTypeMeeting;
    this.doPublish(topic, JSON.stringify(json));
  }
  async _sendMsgWithTranscation(topic: string, json:any) {
    json.bus_type = constdomain.kBusTypeMeeting;
    this.trans.set(json.req_id, {topic: topic, json: json, req_id: json.req_id, retryCount: 5});
    this.doPublish(topic, JSON.stringify(json));
    this.delaySendMsg(topic, json.req_id);
  }

  async sendReq(userId: string, json:any) {
    this._sendMsg(this.getUserTopic(userId), json);
  }
  async sendReqNeedResp(userId: string, json:any) {
    json.need_resp = true;
    this._sendMsgWithTranscation(this.getUserTopic(userId), json);
  }
  async sendResponeNeedAck(userId: string, json:any) {
    json.need_ack = true;
    this._sendMsgWithTranscation(this.getUserTopic(userId), json);
  }
  async sendRespone(userId: string, json:any) {
    this._sendMsg(this.getUserTopic(userId), json);
  }

  async delaySendMsg(topic: string, reqId:string) {
    setTimeout(() => {
      let tran = this.trans.get(reqId)
      if(tran !== undefined) {
        if(tran.retryCount > 0) {
          tran.retryCount--;
          this.trans.set(reqId, tran);
          this.doPublish(topic, JSON.stringify(tran.json));
          this.delaySendMsg(topic, reqId);    
        } else {
          this.trans.delete(reqId);
        }
      }
    }, 5000);
  }
  transDone(reqId: string) {
    this.trans.delete(reqId);
  }

}


export default MsgTrans;
