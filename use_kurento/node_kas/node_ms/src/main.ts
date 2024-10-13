import QMqttClient from "./qmqtt";
import * as constdomain from "./constdomain";

import * as meetingMedia from './media';
import * as meetingMediaApi from './mediaapi';
import CallService from './call_service'


class RtcMain {
  qmqttclient: QMqttClient
  mediaCenter: meetingMediaApi.MediaCenter
  callServiceApi: CallService
    constructor() {
        console.log('RtcMain constructor');
        this.qmqttclient = new QMqttClient(constdomain.mqttUrl);
        this.mediaCenter = meetingMedia.getMeetingCenterKurento(constdomain.kurentoUrl);
        this.callServiceApi = new CallService(this.mediaCenter, this.qmqttclient);
    }
    async start() {
        console.log('RtcMain start');
        await this.callServiceApi.start();
    }
}


export default RtcMain;
