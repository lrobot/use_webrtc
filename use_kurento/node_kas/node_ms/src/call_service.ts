import QMqttClient from './qmqtt';
import * as meetingMediaApi from './mediaapi';
import { PromiseFifoQueue } from './constutil';
import MsgTrans from './msgtrans';
import * as constdomain from './constdomain';
import * as constutil from './constutil';
import { CallGroup, CallMember, CallServiceApi } from './call_base';
import {IntercomGroup} from './call_intercom';
import {MeetingGroup, MeetingMemeber} from './call_meeting';

class CallService implements CallServiceApi {
    mediaCenter: meetingMediaApi.MediaCenter;
    mqtt: QMqttClient
    callGroups:Map<string, CallGroup> = new Map<string, CallGroup>();
    msgTrans: MsgTrans;
    queueGlobal: PromiseFifoQueue = new PromiseFifoQueue();
  
    constructor(mediaCenter: meetingMediaApi.MediaCenter, mqtt: QMqttClient) {
      this.mqtt = mqtt
      this.mediaCenter = mediaCenter;
      this.msgTrans = new MsgTrans(mqtt);
    }
    public static async sendMessageToUser(userId: string, message: string) {
      // send message to user
    }
    public async sendRespMsg(msg:any, code: number, codeMsg: string, useTranscation:boolean = false) {
      let response_msg = {
        type: constdomain.kMsgResponse,
        for_type: msg.type,
        code: code,
        code_msg: codeMsg,
        req_id: msg.req_id,
        need_ack: false,
      } as constdomain.respone_base;
      if(useTranscation) {
        await this.msgTrans.sendResponeNeedAck(msg.user_id, response_msg);
      } else {
        await this.msgTrans.sendRespone(msg.user_id, response_msg);
      }
    }
    async start() {
      this.mqtt.on(constdomain.kMqttTopicMeetingService, (message) => {
        console.log('m_ in_:',  message);
        this.onMessage(message);
      });
      console.log(await this.mqtt.subscribeAsync(constdomain.kMqttTopicMeetingService));
      console.log(await this.mqtt.publishAsync(constdomain.kMqttTopicMeetingService, JSON.stringify({type: 'ack', id: '123'})));
    }
    public async onMessage(message:string) {
      const meetingMessage = JSON.parse(message)
      this.queueGlobal.enqueue(async () => {
        await this.handleMessage(meetingMessage);
      });
    }
    onGroupRemoved(meetingType:string, meetingId: string) {
      let meetingId_ = `${meetingType}_${meetingId}`;
      this.callGroups.delete(meetingId_);
    }
    async createMember(callGroup: CallGroup, meetingMessage:any, mediaEndpoint: meetingMediaApi.MediaEndpoint) {
        var meetingMember = null;
        if(callGroup.meetingType === constdomain.kCallTypeMeeting) {
            meetingMember = new MeetingMemeber(callGroup, meetingMessage, mediaEndpoint);
            meetingMember.videoMediaSync();
        } else {
          meetingMember = new CallMember(callGroup, meetingMessage, mediaEndpoint);
        }
        return meetingMember;
    }
    async sendReqNeedResp(userId: string, json:any) {
        this.msgTrans.sendReqNeedResp(userId, json);
    }
    async sendResponeNeedAck(userId: string, json:any) {
        this.msgTrans.sendResponeNeedAck(userId, json);
    }
    async sendRespone(userId: string, json:any) {
        this.msgTrans.sendRespone(userId, json);
    }
    public async handleMessage(meetingMessage:any) {
      let meeting = null;
      let meetingId_ = `${meetingMessage.meeting_type}_${meetingMessage.meeting_id}`;
      if(meetingMessage.meeting_id) {
        meeting = this.callGroups.get(meetingId_);
      }
      switch (meetingMessage.type) {
        case constdomain.kCallInvite:
          await this.sendRespMsg(meetingMessage, 200, 'ok');
          if(meetingMessage.grp_id) {
            //todo invite by query member in group
            console.log('todo invite by query member in group');
          }
          if(meetingMessage.members){
            const allMembers = meetingMessage.members;
            meetingMessage.members = undefined;
            allMembers.forEach((member:any) => {
              const cloneInviteMsg = JSON.parse(JSON.stringify(meetingMessage));
              cloneInviteMsg.to = member;
              this.sendReqNeedResp(member, cloneInviteMsg);
            });  
          }
          break;
        case constdomain.kCallJoin:
          if (!meeting) {
            if(!meetingMessage.meeting_id) return;
            if(meetingMessage.meeting_type === constdomain.kCallTypeIntercom) {
              meeting = new IntercomGroup(this,meetingMessage.meeting_type, meetingMessage.meeting_id, await this.mediaCenter.createGroup(true));
              this.callGroups.set(meetingId_, meeting);
            }
            if(meetingMessage.meeting_type === constdomain.kCallTypeMeeting) {
              if(meetingMessage.create) {
                meeting = new MeetingGroup(this,meetingMessage.meeting_type, meetingMessage.meeting_id, await this.mediaCenter.createGroup(true), await this.mediaCenter.createGroup(false));
                this.callGroups.set(meetingId_, meeting);
              }
            }
          }
          if(meeting) {
            await meeting.onMessage(meetingMessage);
          } else {
            await this.sendRespMsg(meetingMessage, 404, 'meeting not found');
          }
          break;
        case constdomain.kMsgAck:
        case constdomain.kMsgResponse:
          await this.msgTrans.transDone(meetingMessage.req_id);
          break;
        default:
          if(meeting) {
            await meeting.onMessage(meetingMessage);
          } else {
            await this.sendRespMsg(meetingMessage, 404, 'meeting not found');
          }
      }
      return;
    }
  }
  
  
  export default CallService;
  