import * as constdomain from "./constdomain";
import constutil from "./constutil";
import { CallGroup, CallMember, CallServiceApi } from "./call_base";
import * as meetingMediaApi from './mediaapi';


export class MeetingMemeber extends CallMember {
    pushEndpoint: meetingMediaApi.MediaEndpoint|null = null;
    pullEndpoints: Map<string, meetingMediaApi.MediaEndpoint> = new Map<string, meetingMediaApi.MediaEndpoint>();
    meetingGroup: MeetingGroup;
    constructor(callGroup: CallGroup, msg:any, mediaEndpoint: meetingMediaApi.MediaEndpoint) {
      super(callGroup, msg, mediaEndpoint);
      this.meetingGroup = callGroup as MeetingGroup;
    }
    async videoMediaSync() {
      if(!this.meetingGroup.video) {
        if(this.pushEndpoint) {
          try {
            this.pushEndpoint.release();
          } catch (error) {
            console.error('release pushEndpoint error', error);
          }
          this.pushEndpoint = null;
        }
        const tmpEndpoints = this.pullEndpoints;
        this.pullEndpoints = new Map<string, meetingMediaApi.MediaEndpoint>();
        for (let [userId, endpoint] of tmpEndpoints) {
          try {
            endpoint.release();
          } catch (error) {
            console.error('release pullEndpoint error 2', error);
            
          }
        }
      }
    }
    public async handleMessage(meetingMessage:any) {
      switch (meetingMessage.type) {
        case constdomain.kMsgMediaPushVideo:
          this.handleMediaPushMedia(meetingMessage);
          break;
        case constdomain.kMsgMediaPullVideo:
          this.handleMediaPullMedia(meetingMessage);
          break;
        case constdomain.kMsgMediaVideoIce:
          this.handleMediaVideoIce(meetingMessage);
          break;
        default:
          this._handleMessage(meetingMessage);
      }
    }
    public async sendMediaReply(msg:any, code: number, codeMsg: string, sdp_answer:string, useTranscation:boolean = true) {
      let join_ok = {
        type: constdomain.kMsgResponse,
        for_type: msg.type,
        code: code,
        code_msg: codeMsg,
        req_id: msg.req_id,
        peer_id: msg.type==constdomain.kMsgMediaPushVideo?undefined:msg.peer_id,
        sdp_answer: sdp_answer,
      } as constdomain.call_pull_media_response;
      if(useTranscation) {
        await this.callGroup.callServiceApi.sendResponeNeedAck(msg.user_id, join_ok);
      } else {
        await this.callGroup.callServiceApi.sendRespone(msg.user_id, join_ok);
      }
    }
    public async createVideoEndpointForUserId(userId: string) {
      const endpoint = this.callGroup.mediaGroup.createEndpoint();
      this.defaultMediaEndpoint.setIceCandidateCallback(async (candidate:any) => {
        let iceCandidate = {
          type: constdomain.kMsgMediaVideoIce,
          req_id: constutil.makeid(),
          meeting_id: this.callGroup.meetingId,
          peer_id : userId,
          call_id: this.callId,
          ice: candidate
        } as constdomain.call_pull_ice;
        await this.callGroup.callServiceApi.sendReqNeedResp(this.userId, iceCandidate); // send ice candidate to other members
      });
      this.defaultMediaEndpoint.setIceStateCallback(async (state:string) => {
        console.log('pull IceComponentStateChange',userId, state);
        // switch (state) {
        //   case 'DISCONNECTED':
        //   case 'FAILED':
        //     if(this.lastIceState != 'DISCONNECTED' && this.lastIceState != 'FAILED') {
        //       this.lastIceState = state;
        //       const thisTime = Date.now() + + Math.floor(Math.random() * 10000);
        //       this.lastIceStateMs = thisTime;
        //       setTimeout(() => {
        //         if(this.lastIceState === state && this.lastIceStateMs === thisTime) {
        //           this.callGroup.setCurrentSpeaker
        //         }
        //       }, 15*1000);  
        //     }
        //     break;
        //   case 'CONNECTED':
        //   case 'READY':
        //   case "GATHERING":
        //   case "CONNECTING":
        //     this.lastIceState = state;
        //     this.lastIceStateMs = Date.now() + Math.floor(Math.random() * 10000);
        //     break;
        //   default:
        //     console.log('IceComponentStateChange', event);
        //     break;
        // }
        // console.log('OnIceComponentStateChanged', event);
      });
      return endpoint;
    }
    public async handleMediaPushMedia(meetingMessage: constdomain.call_pull_media) {
      const reqId = meetingMessage.req_id;
      if(this.pushEndpoint){
        const cacheReqId = this.pushEndpoint.getUserData('req_id');
        if(cacheReqId === reqId) {
          await this.sendMediaReply(meetingMessage, 200, 'ok', this.pushEndpoint.getSdpAnswer());
          return;
        } else {
          try {
            this.pushEndpoint.release();
          } catch (error) {
            console.error('release pushEndpoint error', error);
          }
          this.pushEndpoint = null;  
        }
      }
      this.pushEndpoint = await this.createVideoEndpointForUserId(this.userId);
      this.pushEndpoint.setUserData('req_id', reqId);
      const sdp_answer = await this.pushEndpoint.processOffer(meetingMessage.sdp_offer);
      await this.sendMediaReply(meetingMessage, 200, 'ok', sdp_answer);
    }
    public async handleMediaPullMedia(meetingMessage: constdomain.call_pull_media) {
      const reqId = meetingMessage.req_id;
      const peerMember = this.callGroup.members.get(meetingMessage.peer_id) as MeetingMemeber;
      if(!peerMember||peerMember.pushEndpoint === null) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peer not found');
        return;
      }
      var pullEndpont = this.pullEndpoints.get(meetingMessage.peer_id);
      if(pullEndpont) {
        if(reqId === pullEndpont.getUserData('req_id')) {
          await this.sendMediaReply(meetingMessage, 200, 'ok', pullEndpont.getSdpAnswer());
          return;
        } else {
          try {
            pullEndpont.release();
          } catch (error) {
            console.error('release pullEndpoint error', error);
          }
          this.pullEndpoints.delete(meetingMessage.peer_id);
          pullEndpont = undefined;
        }
      }
      
      try {
        const pullEndpont = await this.createVideoEndpointForUserId(meetingMessage.peer_id);
        pullEndpont.setUserData('req_id', reqId);
        this.pullEndpoints.set(meetingMessage.peer_id, pullEndpont);
        peerMember.pushEndpoint.connectSendTo(pullEndpont, 'VIDEO');
        const sdp_answer = await pullEndpont.processOffer(meetingMessage.sdp_offer);
        await this.sendMediaReply(meetingMessage, 200, 'ok', sdp_answer);
      } catch (error) {
        console.error('createEndpoint error', error);
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 500, 'create media member error');
      }
    }
    public async handleMediaVideoIce(meetingMessage: constdomain.call_pull_ice) {
      let iceEndpoint = null;
      if(!meetingMessage.peer_id) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peer_id not found');
      }
      if(meetingMessage.peer_id === this.userId) {
        iceEndpoint = this.pushEndpoint;
      } else {
        iceEndpoint = this.pullEndpoints.get(meetingMessage.peer_id);
      }
      if(!iceEndpoint) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'iceEndpoint not found');
        return;
      }
      const pullEndpont = this.pullEndpoints.get(meetingMessage.peer_id);
      if(!pullEndpont) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'pullEndpont not found');
        return;
      }
      await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
      meetingMessage.ice.candidate = meetingMessage.ice.sdp;
      iceEndpoint.addIceCandidate(meetingMessage.ice);
    }
  }

export class MeetingGroup extends CallGroup {
    video: boolean = false;
    videoMediaGroup: meetingMediaApi.MediaGroup;
    allMembers: Map<string, CallMember> = new Map<string, CallMember>();
    constructor(callServiceApi: CallServiceApi, meetingType:string,  meetingId:string, mediaGroup: meetingMediaApi.MediaGroup, videoMediaGroup: meetingMediaApi.MediaGroup) {
      super(callServiceApi, meetingType,  meetingId, mediaGroup);
      this.videoMediaGroup = videoMediaGroup;
    }
    async handleMessage(meetingMessage:any) {
      var meetingMember = await this.tryLoadMeetingMember(meetingMessage);
      if(meetingMember) {
        switch (meetingMessage.type) {
          case constdomain.kMsgMediaPullVideo:
          case constdomain.kMsgMediaPushVideo:
          case constdomain.kMsgMediaVideoIce:
            await meetingMember.onMessage(meetingMessage);
            break;
          case constdomain.kMsgQueryMemberOnline:
            await this.handleQueryMemberOnline(meetingMessage);
            break;
          case constdomain.kMsgQueryMemberAll:
            await this.handleQueryMemberAll(meetingMessage);
            break;
          case constdomain.kMsgQueryMemberOne:
            await this.handleQueryMemberOne(meetingMessage);
            break;
          case constdomain.kMsgUpdateMyStatus:
            await this.handleUpdateMyStatus(meetingMessage);
            break;
          case constdomain.kMsgMeetingCtrl:
            await this.handleMeetingCtrl(meetingMessage);
            break;
          default:
            await this._handleMessage(meetingMessage);
            break;
        }
      } else {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'meeting user not found');
      }
    }
  
    public async handleQueryMemberOnline(meetingMessage: constdomain.request_base) {
      let response = {
        type: constdomain.kMsgResponse,
        req_id: meetingMessage.req_id,
        for_type: constdomain.kMsgQueryMemberOnline,
        code: 200,
        code_msg: 'ok',
        members: [...this.members].map(([userId, member]) => member.toOnlineJson())
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.user_id, response);
    }
    public async handleQueryMemberAll(meetingMessage: constdomain.request_base) {
      let response = {
        type: constdomain.kMsgResponse,
        req_id: meetingMessage.req_id,
        for_type: constdomain.kMsgQueryMemberAll,
        code: 200,
        code_msg: 'ok',
        members: [...this.allMembers].map(([userId, member]) => {return {id: userId, name: member.name};})
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.user_id, response);
    }
    public async handleQueryMemberOne(meetingMessage: constdomain.request_base) {
      let member = this.allMembers.get((meetingMessage as any).query_user_id);
      if(!member) {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'member not found');
        return;
      }
      let response = {
        type: constdomain.kMsgResponse,
        req_id: meetingMessage.req_id,
        for_type: constdomain.kMsgQueryMemberOne,
        code: 200,
        code_msg: 'ok',
        member: member.toFullJson()
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.user_id, response);
    }
    public async handleUpdateMyStatus(meetingMessage: constdomain.request_base) {
      let member = this.members.get(meetingMessage.user_id);
      if(!member) {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'member not found');
        return;
      }
      let hasChange = false;
      const mic_on = (meetingMessage as any).mic_on;
      const camera_on = (meetingMessage as any).camera_on;
      const mt_in_state = (meetingMessage as any).mt_in_state;
      if(mic_on !== undefined&& mic_on !== member.mic_on) {
        member.mic_on = mic_on;
        hasChange = true;
      }
      if(camera_on !== undefined&& camera_on !== member.camera_on) {
        member.camera_on = camera_on;
        hasChange = true;
      }
      if(mt_in_state !== undefined&& mt_in_state !== member.mt_in_state) {
        member.mt_in_state = mt_in_state;
        hasChange = true;
      }
      await this.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
      if(hasChange) {
        this.broadcastMemberStatus(member, meetingMessage.user_id);
      }
    }
    public async broadcastMemberStatus(infoMember: CallMember,excludeUser:string) {
      for (let [userId, member] of this.members) {
        if(userId !== excludeUser) {
          this.callServiceApi.sendReqNeedResp(userId, {
            type: constdomain.kMsgInfoUserStatus,
            req_id: constutil.makeid(),
            from: constdomain.kMqttTopicMeetingService,
            meeting_id: this.meetingId,
            call_id: member.callId,
            to: userId,
            members: [infoMember.toOnlineJson()],
          });
        }
      }
    }
    public async handleMeetingCtrl(meetingMessage: constdomain.request_base) {
      //todo
    }
  }
  