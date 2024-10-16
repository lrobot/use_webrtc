import * as constdomain from "./constdomain";
import constutil from "./constutil";
import { CallGroup, CallMember } from "./call_base";
import * as meetingMediaApi from './mediaapi';

export class IntercomGroup extends CallGroup {
    public async handleMessage(meetingMessage:any) {
      var meetingMember = await this.tryLoadMeetingMember(meetingMessage);
      if(meetingMember) {
        switch (meetingMessage.type) {
          case constdomain.kIntercomQuery:
            await this.handleQuery(meetingMessage);
            break;
          case constdomain.kIntercomSpeechCtrl:
            await this.handleSpeechCtrl(meetingMessage);
            break;
          default:
            await this._handleMessage(meetingMessage);
        }  
      } else {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'meeting user not found');
      }
    }
  
    public handleMemberMediaLost(CallMember: CallMember) {
      this.queue.enqueue(async () => {
        if(CallMember.userId === this.currentSpeakerUser) {
          this.setCurrentSpeaker("", constdomain.kDefaultSpeechLevel);
          this.broadcastStatus(this);
        }
      });
    }
    async speechCtrlResponse(reqId:string, userId:string, code:number, codeMsg:string) {
      await this.callServiceApi.sendRespone(userId, {
        type:constdomain.kMsgResponse,
        reqId: reqId,
        from: constdomain.kMqttTopicMeetingService,
        to: userId,
        forType: constdomain.kIntercomSpeechCtrl,
        code: code,
        codeMsg: codeMsg,
        needAck: true,
      } as constdomain.respone_base);
    }
  
    async handleQuery(meetingMessage: constdomain.request_base) {
      let response = {
        type: constdomain.kMsgResponse,
        reqId: meetingMessage.reqId,
        forType: constdomain.kIntercomQuery,
        code: 200,
        codeMsg: 'ok',
        currentSpeakerUser: this.currentSpeakerUser,
        currentStatusCnt: this.currentStatusCnt,
        currentSpeakerLevel: this.currentSpeakerLevel,
      } as constdomain.intercom_status_resp;
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.userId, response);
    }
  
    async broadcastStatus(meeting: CallGroup, excludeUser:string = "") {
      for (let [userId, member] of meeting.members) {
        if(userId !== excludeUser) {
          this.callServiceApi.sendReqNeedResp(userId, {
            type: constdomain.kIntercomStatus,
            reqId: constutil.makeid(),
            from: constdomain.kMqttTopicMeetingService,
            meetingId: meeting.meetingId,
            callId: member.callId,
            to: userId,
            currentSpeakerUser: meeting.currentSpeakerUser,
            currentStatusCnt: meeting.currentStatusCnt,
            currentSpeakerLevel: meeting.currentSpeakerLevel
          } as constdomain.intercom_status_req);
        }
      }
    }
  
    async _handleSpeechForce(meetingMessage: constdomain.request_intercom_speech_ctrl) {
      if(this.currentSpeakerLevel < meetingMessage.userSpeechLevel) {
        await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 400, 'speaker level is lower');
        return;
      }
      const newUserId = meetingMessage.speechOn?meetingMessage.userId:"";
      const newLevel = meetingMessage.speechOn?meetingMessage.userSpeechLevel:constdomain.kDefaultSpeechLevel;
  
      await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 200, 'ok');
      if(this.currentSpeakerUser !== newUserId) {
        this.setCurrentSpeaker(newUserId, newLevel);
        this.broadcastStatus(this, meetingMessage.userId);
      }
    }
  
    async _handleSpeechCtrl(meetingMessage: constdomain.request_intercom_speech_ctrl) {
      if(meetingMessage.speechOn) {
        if(this.currentSpeakerUser === ""||this.currentSpeakerUser === meetingMessage.userId) {
          if(this.currentSpeakerUser === meetingMessage.userId) {
            await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 200, 'ok');
          } else {
            this.setCurrentSpeaker(meetingMessage.userId, meetingMessage.userSpeechLevel);
            await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 200, 'ok');
            this.broadcastStatus(this, meetingMessage.userId);
          }
        } else {
          await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 400, 'speaker exist');
        }
      } else {
        if(this.currentSpeakerUser === "") {
          await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 200, "no_speakder");
        } else if(this.currentSpeakerUser === meetingMessage.userId) {
          this.setCurrentSpeaker("", constdomain.kDefaultSpeechLevel);
          await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 200, "ok");
          this.broadcastStatus(this, meetingMessage.userId);
        } else {
          await this.speechCtrlResponse(meetingMessage.reqId, meetingMessage.userId, 400, "speaker is not you");
        }
      }
    }
  
  
    async handleSpeechCtrl(meetingMessage: constdomain.request_intercom_speech_ctrl) {
      if(meetingMessage.force) {
        await this._handleSpeechForce(meetingMessage);
      } else {
        await this._handleSpeechCtrl(meetingMessage);
      }
    }
  }
  
  
  
  