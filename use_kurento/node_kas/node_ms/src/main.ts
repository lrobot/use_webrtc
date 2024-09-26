import QMqttClient from "./qmqtt";
import * as constdomain from "./constdomain";

import * as meetingMedia from './meetingMedia';
import * as meetingMediaApi from './meetingMediaApi';
import MeetingService from "./basemeeting";


class RtcMain {
  qmqttclient: QMqttClient
  mediaCenter: meetingMediaApi.MediaCenter
  meetingService: MeetingService
    constructor() {
        console.log('RtcMain constructor');
        this.qmqttclient = new QMqttClient(constdomain.mqttUrl);
        this.mediaCenter = meetingMedia.getMeetingCenterKurento(constdomain.kurentoUrl);
        this.meetingService = new MeetingService(this.mediaCenter, this.qmqttclient);
    }
    async start() {
        console.log('RtcMain start');
        await this.meetingService.start();
    }
}


export default RtcMain;
