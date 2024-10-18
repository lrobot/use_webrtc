

import QMqttClient from './qmqtt';
import * as constdomain from './constdomain'
import constutil from './constutil';
import { PromiseFifoQueue } from './constutil';
import MsgTrans from './msgtrans';
import * as meetingMediaApi from './mediaapi';



export class CallMember {
  callGroup: CallGroup;
  defaultMediaEndpoint: meetingMediaApi.MediaEndpoint;
  userId: string;
  callId: string = "";
  lastIceState: string;
  lastIceStateMs: number;
  queue: PromiseFifoQueue = new PromiseFifoQueue();
  name: string = "";
  micOn: boolean = false;
  cameraOn: boolean = false;
  mtInState: number = 0;
  foreverKick: boolean = false;
  foreverMicOff: boolean = false;
  foreverCameraOff: boolean = false;
  mtOutState: string = "";  //inviting|leave|lost|busy|invite_timeout   #字符串描述的再会状态
  mtOutMs: number = 0;  //离开时间
  toOnlineJson() {
    return {
      userId: this.userId,
      name: this.name,
      micOn: this.micOn,
      cameraOn: this.cameraOn,
      mtInState: this.mtInState,
    }
  }
  toFullJson() {
    return { ...this.toOnlineJson(),
      foreverKick: this.foreverKick,
      foreverMicOff: this.foreverMicOff,
      foreverCameraOff: this.foreverCameraOff,
      mtOutState: this.mtOutState,
      mtOutMs: this.mtOutMs,
    }
  }
  constructor(callGroup: CallGroup, msg:any, mediaEndpoint: meetingMediaApi.MediaEndpoint) {
    this.lastIceState = 'DISCONNECTED';
    this.lastIceStateMs = Date.now();
    this.callGroup = callGroup;
    this.userId = msg.userId;
    this.callId = msg.callId;
    this.defaultMediaEndpoint = mediaEndpoint;
    this.defaultMediaEndpoint.setIceCandidateCallback(async (candidate:any) => {
      let iceCandidate = {
        type: constdomain.kCallIce,
        reqId: constutil.makeid(),
        meetingId: this.callGroup.meetingId,
        callId: this.callId,
        ice: candidate
      } as constdomain.intercom_ice;
      await this.callGroup.callServiceApi.sendReqNeedResp(this.userId, iceCandidate); // send ice candidate to other members
    });
    this.defaultMediaEndpoint.setIceStateCallback(async (state:string) => {
      console.log('IceComponentStateChange', state);
      switch (state) {
        case 'DISCONNECTED':
        case 'FAILED':
          if(this.lastIceState != 'DISCONNECTED' && this.lastIceState != 'FAILED') {
            this.lastIceState = state;
            const thisTime = Date.now() + Math.floor(Math.random() * 10000);
            this.lastIceStateMs = thisTime;
            setTimeout(() => {
              if(this.lastIceState === state && this.lastIceStateMs === thisTime) {
                this.callGroup.handleMemberMediaLost(this);
              }
            }, 15*1000);  
          }
          break;
        case 'CONNECTED':
        case 'READY':
        case "GATHERING":
        case "CONNECTING":
          this.lastIceState = state;
          this.lastIceStateMs = Date.now() + Math.floor(Math.random() * 10000);
          break;
        default:
          console.log('IceComponentStateChange', event);
          break;
      }
      // console.log('OnIceComponentStateChanged', event);
    });
  }

  public async onMessage(meetingMessage:any) {
    this.queue.enqueue(async () => {
      await this.handleMessage(meetingMessage);
    });
  }
  public async handleMessage(meetingMessage:any) {
    this._handleMessage(meetingMessage);
  }
  public async _handleMessage(meetingMessage:any) {
    switch (meetingMessage.type) {
      case constdomain.kCallJoin:
        await this.handleJoin(meetingMessage);
        break;
      case constdomain.kCallLeave:
        await this.handleLeave(meetingMessage);
        break;
      case constdomain.kCallIce:
        await this.handleIce(meetingMessage);
        break;
      default:
        console.log('unknown message type', meetingMessage.type);
    }
  }

  async handleJoin(meetingMessage:any) {
    if(this.defaultMediaEndpoint.hasSdpAnswer()) {
      await this.sendJoinReply(meetingMessage, 200, 'ok', this.defaultMediaEndpoint.getSdpAnswer(), false);
    }else {
      const sdpAnswer = await this.defaultMediaEndpoint.processOffer(meetingMessage.sdpOffer);
      await this.sendJoinReply(meetingMessage, 200, 'ok', sdpAnswer, true);
    }
  }


  async handleLeave(meetingMessage: constdomain.request_base) {
    await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
    this.release();
    this.callGroup.doMemberRemove(this.userId);
  }
  async handleIce(meetingMessage: constdomain.intercom_ice) {
    await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
    if(meetingMessage.ice.sdp && !meetingMessage.ice.candidate) {
      meetingMessage.ice.candidate = meetingMessage.ice.sdp;
    }
    await this.addIceCandidate(meetingMessage.ice);
  }

  public release() {
    this.defaultMediaEndpoint.release();
  }

  public async sendJoinReply(msg:any, code: number, codeMsg: string, sdpAnswer:string, useTranscation:boolean = true) {
    let join_ok = {
      type: constdomain.kMsgResponse,
      forType: msg.type,
      code: code,
      codeMsg: codeMsg,
      reqId: msg.reqId,
      sdpAnswer: sdpAnswer,
    } as constdomain.call_join_response;
    if(useTranscation) {
      await this.callGroup.callServiceApi.sendResponeNeedAck(msg.userId, join_ok);
    } else {
      await this.callGroup.callServiceApi.sendRespone(msg.userId, join_ok);
    }
  }

  public async addIceCandidate(iceCandidate: any) {
     await this.defaultMediaEndpoint.addIceCandidate(iceCandidate);
  }
}



export class CallGroup {
  queue: PromiseFifoQueue = new PromiseFifoQueue();
  constructor(callServiceApi: CallServiceApi, meetingType:string,  meetingId:string, mediaGroup: meetingMediaApi.MediaGroup) {
    this.callServiceApi = callServiceApi;
    this.meetingType = meetingType,
    this.meetingId = meetingId;
    this.mediaGroup = mediaGroup;
  }
  mediaGroup: meetingMediaApi.MediaGroup
  callServiceApi: CallServiceApi;
  meetingId: string;
  meetingType: string = "";
  members: Map<string, CallMember> = new Map<string, CallMember>();
  currentSpeakerUser: string = "";
  currentStatusCnt: number = 0;
  currentSpeakerLevel: number = constdomain.kDefaultSpeechLevel;
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
  public handleMemberMediaLost(CallMember: CallMember) {
    console.log('err call handleMemberMediaLost on base');
  }
  public async onMessage(meetingMessage:any) {
    this.queue.enqueue(async () => {
      await this.handleMessage(meetingMessage);
    });
  }
  doMemberRemove(userId: string) {
    this.members.delete(userId);
    if(this.members.size === 0) {
      console.log('meeting remove', this.meetingId, "when member is 0", userId);
      this.callServiceApi.onGroupRemoved(this.meetingType, this.meetingId);
      this.release();
    }
  }
  async handleMessage(meetingMessage:any) {
    await this._handleMessage(meetingMessage);
  }
  async tryLoadMeetingMember(meetingMessage:any) {
    var meetingMember = null;
    if(meetingMessage.userId) {
      meetingMember = this.members.get(meetingMessage.userId);
    }
    if(meetingMessage.type === constdomain.kCallJoin) {
      if(meetingMember && meetingMember.callId !== meetingMessage.callId) {
        //delete exist old member
        meetingMember.release();
        meetingMember = null;
        this.members.delete(meetingMessage.userId);
      }
      if(!meetingMember) {
        if(meetingMessage.userId === undefined) return;
        try {
          const mediaEndpoint = await this.mediaGroup.createEndpoint();
          meetingMember = await this.callServiceApi.createMember(this, meetingMessage, mediaEndpoint);
        } catch (error) {
          console.error('createEndpoint error', error);
          await this.callServiceApi.sendRespMsg(meetingMessage, 500, 'create media member error');
          return; 
        }
        this.members.set(meetingMessage.userId, meetingMember);
      }  
    }
    return meetingMember;
  }
  async _handleMessage(meetingMessage:any) {
    var meetingMember = await this.tryLoadMeetingMember(meetingMessage);
    if(meetingMember) {
      switch (meetingMessage.type) {
        case constdomain.kCallJoin:
        case constdomain.kCallLeave:
        case constdomain.kCallIce:
          await meetingMember.onMessage(meetingMessage);
          break;
        default:
          console.log('unknown message type', meetingMessage.type);
          break;
      }
      
    } else {
      await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'meeting user not found');
    }
  }
}


export interface CallServiceApi {
  onGroupRemoved(meetingType:string, meetingId: string): void;
  createMember(callGroup: CallGroup, meetingMessage:any, mediaEndpoint: meetingMediaApi.MediaEndpoint): Promise<CallMember>;
  handleMessage(meetingMessage:any): void;
  sendRespMsg(meetingMessage:any, code: number, codeMsg: string): void;
  sendReqNeedResp(userId: string, json:any): void;
  sendResponeNeedAck(userId: string, json:any): void;
  sendRespone(userId: string, json:any): void;
}
