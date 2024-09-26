

import QMqttClient from './qmqtt';
import * as constdomain from './constdomain'
import constutil from './constutil';
import { PromiseFifoQueue } from './constutil';
import MsgTrans from './msgtrans';
import * as meetingMediaApi from './meetingMediaApi';



export class MeetingMember {
  queue: PromiseFifoQueue = new PromiseFifoQueue();
  constructor(meetingBean: MeetingGroup, msg:any, mediaMember: meetingMediaApi.MediaMember) {
    this.meetingBean = meetingBean;
    this.userId = msg.user_id;
    this.callId = msg.call_id;
    this.mediaMember = mediaMember;
    this.mediaMember.setIceCandidateCallback(async (candidate:any) => {
      let iceCandidate = {
        type: constdomain.kCallIce,
        req_id: constutil.makeid(),
        meeting_id: this.meetingBean.meetingId,
        call_id: this.callId,
        ice: candidate
      } as constdomain.intercom_ice;
      await this.meetingBean.meetingService.msgTrans.sendReqNeedResp(this.userId, iceCandidate); // send ice candidate to other members
    });
  }
  meetingBean: MeetingGroup;
  mediaMember: meetingMediaApi.MediaMember;
  userId: string;
  callId: string = "";
  sdp_answer: string|null = null;

  public async onMessage(meetingMesssage:any) {
    this.queue.enqueue(async () => {
      this.handleMessage(meetingMesssage);
    });
  }

  public async handleMessage(meetingMesssage:any) {
    switch (meetingMesssage.type) {
      case constdomain.kCallJoin:
        await this.handleJoin(meetingMesssage);
        break;
      case constdomain.kCallLeave:
        await this.handleLeave(meetingMesssage);
        break;
      case constdomain.kCallIce:
        await this.handleIce(meetingMesssage);
        break;
      case constdomain.kIntercomQuery:
      case constdomain.kIntercomSpeechCtrl:
        this.meetingBean.handleExtMessage(meetingMesssage);
        break;
      default:
        console.log('unknown message type', meetingMesssage.type);
    }
  }

  async handleJoin(meetingMesssage:any) {
    if(this.sdp_answer) {
      await this.sendJoinReply(meetingMesssage, 200, 'ok', this.sdp_answer, false);
    }else {
      this.sdp_answer = await this.mediaMember.processOffer(meetingMesssage.sdp_offer);
      await this.sendJoinReply(meetingMesssage, 200, 'ok', this.sdp_answer, true);
    }
  }


  async handleLeave(meetingMesssage: constdomain.request_base) {
    await this.meetingBean.meetingService.sendRespMsg(meetingMesssage, 200, 'ok');
    this.release();
    this.meetingBean.doMemberRemove(this.userId);
  }
  async handleIce(meetingMesssage: constdomain.intercom_ice) {
    await this.meetingBean.meetingService.sendRespMsg(meetingMesssage, 200, 'ok');
    meetingMesssage.ice.candidate = meetingMesssage.ice.sdp;
    this.addIceCandidate(meetingMesssage.ice);
  }

  public async release() {
    await this.mediaMember.release();
  }

  public async sendJoinReply(msg:any, code: number, codeMsg: string, sdp_answer:string, useTranscation:boolean = true) {
    let join_ok = {
      type: constdomain.kMsgResponse,
      for_type: msg.type,
      code: code,
      code_msg: codeMsg,
      req_id: msg.req_id,
      sdp_answer: sdp_answer,
    } as constdomain.call_join_response;
    if(useTranscation) {
      await this.meetingBean.meetingService.msgTrans.sendResponeNeedAck(msg.user_id, join_ok);
    } else {
      await this.meetingBean.meetingService.msgTrans.sendRespone(msg.user_id, join_ok);
    }
  }

  public async addIceCandidate(iceCandidate: any) {
     this.mediaMember.addIceCandidate(iceCandidate);
  }
}

export class MeetingGroup {
  queue: PromiseFifoQueue = new PromiseFifoQueue();
  constructor(meetingService: MeetingService, meetingType:string,  meetingId:string, mediaGroup: meetingMediaApi.MediaGroup) {
    this.meetingService = meetingService;
    this.meetingType = meetingType,
    this.meetingId = meetingId;
    this.mediaGroup = mediaGroup;
  }
  mediaGroup: meetingMediaApi.MediaGroup
  meetingService: MeetingService;
  meetingId: string;
  meetingType: string = "";
  members: Map<string, MeetingMember> = new Map<string, MeetingMember>();
  currentSpeakerUser: string = "";
  currentStatusCnt: number = 0;
  currentSpeakerLevel: number = 0;
  public async handleExtMessage(meetingMessage:any) {
    console.log('err call handleExtMessage on base');
  }
  public release() {
    this.members.forEach((member) => {
      member.release();
    });
    this.mediaGroup.release();
  }
  public setCurrentSpeaker(speaker: string, speakerLevel: number) {
    if(this.currentSpeakerUser !== speaker) {
      this.currentSpeakerLevel = speakerLevel;
      this.currentSpeakerUser = speaker;
      this.currentStatusCnt++;
    }
  }
  public async onMessage(meetingMesssage:any) {
    this.queue.enqueue(async () => {
      await this.handleMessage(meetingMesssage);
    });
  }
  async doMemberRemove(userId: string) {
    this.members.delete(userId);
    if(this.members.size === 0) {
      this.release();
      this.meetingService.onGroupRemoved(this.meetingType, this.meetingId);
    }
  }

  async handleMessage(meetingMesssage:any) {
    var meetingMember = null;
    if(meetingMesssage.user_id) {
      meetingMember = this.members.get(meetingMesssage.user_id);
    }
    if(meetingMesssage.type === constdomain.kCallJoin) {
      if(meetingMember && meetingMember.callId !== meetingMesssage.call_id) {
        //delete exist old member
        meetingMember.release();
        meetingMember = null;
        this.members.delete(meetingMesssage.user_id);
      }
      if(!meetingMember) {
        if(meetingMesssage.user_id === undefined) return;
        meetingMember = new MeetingMember(this, meetingMesssage, await this.mediaGroup.createMember());
        this.members.set(meetingMesssage.user_id, meetingMember);
      }  
    }
    if(meetingMember) {
      switch (meetingMesssage.type) {
        case constdomain.kCallJoin:
        case constdomain.kCallLeave:
        case constdomain.kCallIce:
          await meetingMember.onMessage(meetingMesssage);
          break;
        case constdomain.kIntercomQuery:
        case constdomain.kIntercomSpeechCtrl:
          await this.handleExtMessage(meetingMesssage);
          break;
      }
      
    } else {
      await this.meetingService.sendRespMsg(meetingMesssage, 404, 'meeting user not found');
    }
  }
}


export class IntercomMeeting extends MeetingGroup {
  public async handleExtMessage(meetingMessage:any) {
    switch (meetingMessage.type) {
      case constdomain.kIntercomQuery:
        await this.handleQuery(meetingMessage);
        break;
      case constdomain.kIntercomSpeechCtrl:
        await this.handleSpeechCtrl(meetingMessage);
        break;
      default:
        console.log('unknown message type', meetingMessage.type);
    }
  }
  
  async speechCtrlResponse(reqId:string, userId:string, code:number, codeMsg:string) {
    await this.meetingService.msgTrans.sendRespone(userId, {
      type:constdomain.kMsgResponse,
      req_id: reqId,
      from: constdomain.kMqttTopicMeetingService,
      to: userId,
      for_type: constdomain.kIntercomSpeechCtrl,
      code: code,
      code_msg: codeMsg,
      need_ack: true,
    } as constdomain.respone_base);
  }

  async handleQuery(meetingMessage: constdomain.request_base) {
    let response = {
      type: constdomain.kMsgResponse,
      req_id: meetingMessage.req_id,
      for_type: constdomain.kIntercomQuery,
      code: 200,
      code_msg: 'ok',
      current_speaker_user: this.currentSpeakerUser,
      current_status_cnt: this.currentStatusCnt,
      current_speaker_level: this.currentSpeakerLevel,
    } as constdomain.intercom_status_resp;
    await this.meetingService.msgTrans.sendResponeNeedAck(meetingMessage.user_id, response);
  }

  async broadcastStatus(meeting: MeetingGroup, excludeUser:string = "") {
    for (let [userId, member] of meeting.members) {
      if(userId !== excludeUser) {
        this.meetingService.msgTrans.sendReqNeedResp(userId, {
          type: constdomain.kIntercomStatus,
          req_id: constutil.makeid(),
          from: constdomain.kMqttTopicMeetingService,
          meeting_id: meeting.meetingId,
          call_id: member.callId,
          to: userId,
          current_speaker_user: meeting.currentSpeakerUser,
          current_status_cnt: meeting.currentStatusCnt,
          current_speaker_level: meeting.currentSpeakerLevel
        } as constdomain.intercom_status_req);
      }
    }
  }

  async _handleSpeechForce(meetingMessage: constdomain.intercom_speechctrl) {
    if(this.currentSpeakerLevel < meetingMessage.user_speech_level) {
      await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 400, 'speaker level is lower');
      return;
    }
    const newUserId = meetingMessage.speech_on?meetingMessage.user_id:"";
    const newLevel = meetingMessage.speech_on?meetingMessage.user_speech_level:999;

    await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 200, 'ok');
    if(this.currentSpeakerUser !== newUserId) {
      this.setCurrentSpeaker(newUserId, newLevel);
      this.broadcastStatus(this, meetingMessage.user_id);
    }
  }

  async _handleSpeechCtrl(meetingMessage: constdomain.intercom_speechctrl) {
    if(meetingMessage.speech_on) {
      if(this.currentSpeakerUser === ""||this.currentSpeakerUser === meetingMessage.user_id) {
        if(this.currentSpeakerUser === meetingMessage.user_id) {
          await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 200, 'ok');
        } else {
          this.setCurrentSpeaker(meetingMessage.user_id, meetingMessage.user_speech_level);
          await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 200, 'ok');
          this.broadcastStatus(this, meetingMessage.user_id);
        }
      } else {
        await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 400, 'speaker exist');
      }
    } else {
      if(this.currentSpeakerUser === "") {
        await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 200, "no_speakder");
      } else if(this.currentSpeakerUser === meetingMessage.user_id) {
        this.setCurrentSpeaker("", 999);
        await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 200, "ok");
        this.broadcastStatus(this, meetingMessage.user_id);
      } else {
        await this.speechCtrlResponse(meetingMessage.req_id, meetingMessage.user_id, 400, "speaker is not you");
      }
    }
  }


  async handleSpeechCtrl(meetingMessage: constdomain.intercom_speechctrl) {
    if(meetingMessage.force) {
      await this._handleSpeechForce(meetingMessage);
    } else {
      await this._handleSpeechCtrl(meetingMessage);
    }
  }
}


class MeetingService {
  mediaCenter: meetingMediaApi.MediaCenter;
  mqtt: QMqttClient
  meetingGroups:Map<string, MeetingGroup> = new Map<string, MeetingGroup>();
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
    const meetingMesssage = JSON.parse(message)
    this.queueGlobal.enqueue(async () => {
      await this.handleMessage(meetingMesssage);
    });
  }
  onGroupRemoved(meetingType:string, meetingId: string) {
    let meetingId_ = `${meetingType}_${meetingId}`;
    this.meetingGroups.delete(meetingId_);
  }
  public async handleMessage(meetingMesssage:any) {
    let meeting = null;
    let meetingId_ = `${meetingMesssage.meeting_type}_${meetingMesssage.meeting_id}`;
    if(meetingMesssage.meeting_id) {
      meeting = this.meetingGroups.get(meetingId_);
    }
    switch (meetingMesssage.type) {
      case constdomain.kCallJoin:
        if (!meeting) {
          if(!meetingMesssage.meeting_id) return;
          meeting = new IntercomMeeting(this,meetingMesssage.meeting_type, meetingMesssage.meeting_id, await this.mediaCenter.createGroup());
          this.meetingGroups.set(meetingId_, meeting);
        }
        if(meeting) {
          await meeting.onMessage(meetingMesssage);
        }
        break;
      case constdomain.kCallLeave:
      case constdomain.kIntercomQuery:
      case constdomain.kIntercomSpeechCtrl:
      case constdomain.kCallIce:
        if(meeting) {
          await meeting.onMessage(meetingMesssage);
        } else {
          await this.sendRespMsg(meetingMesssage, 404, 'meeting not found');
        }
        break;
      case constdomain.kMsgAck:
      case constdomain.kMsgResponse:
        await this.msgTrans.transDone(meetingMesssage.req_id);
        break;
      default:
        console.log('unknown message type', meetingMesssage)
    }
    return;
  }
}


export default MeetingService;

