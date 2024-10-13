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
          this.setCurrentSpeaker("", 999);
          this.broadcastStatus(this);
        }
      });
    }
    async speechCtrlResponse(reqId:string, userId:string, code:number, codeMsg:string) {
      await this.callServiceApi.sendRespone(userId, {
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
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.user_id, response);
    }
  
    async broadcastStatus(meeting: CallGroup, excludeUser:string = "") {
      for (let [userId, member] of meeting.members) {
        if(userId !== excludeUser) {
          this.callServiceApi.sendReqNeedResp(userId, {
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
  
  
  
  