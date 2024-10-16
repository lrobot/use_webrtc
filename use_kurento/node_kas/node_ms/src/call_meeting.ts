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
          await this.handleMediaPushMedia(meetingMessage);
          break;
        case constdomain.kMsgMediaPullVideo:
          await this.handleMediaPullMedia(meetingMessage);
          break;
        case constdomain.kMsgMediaVideoIce:
          await this.handleMediaVideoIce(meetingMessage);
          break;
        default:
          await this._handleMessage(meetingMessage);
      }
    }
    public async sendMediaReply(msg:any, code: number, codeMsg: string, sdpAnswer:string, useTranscation:boolean = true) {
      let join_ok = {
        type: constdomain.kMsgResponse,
        forType: msg.type,
        code: code,
        codeMsg: codeMsg,
        reqId: msg.reqId,
        peerId: msg.type==constdomain.kMsgMediaPushVideo?undefined:msg.peerId,
        sdpAnswer: sdpAnswer,
      } as constdomain.call_pull_video_response;
      if(useTranscation) {
        await this.callGroup.callServiceApi.sendResponeNeedAck(msg.userId, join_ok);
      } else {
        await this.callGroup.callServiceApi.sendRespone(msg.userId, join_ok);
      }
    }
    public async createVideoEndpointForUserId(userId: string) {
      const endpoint = await this.callGroup.mediaGroup.createEndpoint();
      endpoint.setIceCandidateCallback(async (candidate:any) => {
        let iceCandidate = {
          type: constdomain.kMsgMediaVideoIce,
          reqId: constutil.makeid(),
          meetingId: this.callGroup.meetingId,
          peerId : userId,
          callId: this.callId,
          ice: candidate
        } as constdomain.request_call_video_ice;
        await this.callGroup.callServiceApi.sendReqNeedResp(this.userId, iceCandidate); // send ice candidate to other members
      });
      endpoint.setIceStateCallback(async (state:string) => {
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
    public async handleMediaPushMedia(meetingMessage: constdomain.call_pull_video) {
      const reqId = meetingMessage.reqId;
      if(this.pushEndpoint){
        const cacheReqId = this.pushEndpoint.getUserData('reqId');
        if(cacheReqId === reqId) {
          await this.sendMediaReply(meetingMessage, 200, 'ok cached', this.pushEndpoint.getSdpAnswer());
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
      this.pushEndpoint.setUserData('reqId', reqId);
      const sdpAnswer = await this.pushEndpoint.processOffer(meetingMessage.sdpOffer);
      await this.sendMediaReply(meetingMessage, 200, 'ok', sdpAnswer);
      for(let [userId, member] of this.callGroup.members) {
        const meetingMember = member as MeetingMemeber;
        const pullEndpoint = meetingMember.pullEndpoints.get(this.userId);
        if(pullEndpoint) {
          this.pushEndpoint.connectSendTo(pullEndpoint, 'VIDEO');
        }
      }
    }
    public async handleMediaPullMedia(meetingMessage: constdomain.call_pull_video) {
      const reqId = meetingMessage.reqId;
      const peerMember = this.callGroup.members.get(meetingMessage.peerId) as MeetingMemeber;
      if(!peerMember) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peer not found');
        return;
      }
      var pullEndpont = this.pullEndpoints.get(meetingMessage.peerId);
      if(pullEndpont) {
        if(reqId === pullEndpont.getUserData('reqId')) {
          await this.sendMediaReply(meetingMessage, 200, 'ok cached', pullEndpont.getSdpAnswer());
          return;
        } else {
          try {
            pullEndpont.release();
          } catch (error) {
            console.error('release pullEndpoint error', error);
          }
          this.pullEndpoints.delete(meetingMessage.peerId);
          pullEndpont = undefined;
        }
      }
      
      try {
        const pullEndpont = await this.createVideoEndpointForUserId(meetingMessage.peerId);
        pullEndpont.setUserData('reqId', reqId);
        this.pullEndpoints.set(meetingMessage.peerId, pullEndpont);
        const sdpAnswer = await pullEndpont.processOffer(meetingMessage.sdpOffer);
        await this.sendMediaReply(meetingMessage, 200, 'ok', sdpAnswer);
        if(peerMember.pushEndpoint) {
          peerMember.pushEndpoint.connectSendTo(pullEndpont, 'VIDEO');
        }
      } catch (error) {
        console.error('createEndpoint error', error);
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 500, 'create media member error');
      }
    }
    public async handleMediaVideoIce(meetingMessage: constdomain.request_call_video_ice) {
      let iceEndpoint = null;
      if(!meetingMessage.peerId) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peerId not found');
        return;
      }
      if(meetingMessage.peerId === this.userId) {
        iceEndpoint = this.pushEndpoint;
      } else {
        iceEndpoint = this.pullEndpoints.get(meetingMessage.peerId);
      }
      if(!iceEndpoint) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'iceEndpoint not found');
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
        reqId: meetingMessage.reqId,
        forType: constdomain.kMsgQueryMemberOnline,
        code: 200,
        codeMsg: 'ok',
        members: [...this.members].map(([userId, member]) => member.toOnlineJson())
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.userId, response);
    }
    public async handleQueryMemberAll(meetingMessage: constdomain.request_base) {
      let response = {
        type: constdomain.kMsgResponse,
        reqId: meetingMessage.reqId,
        forType: constdomain.kMsgQueryMemberAll,
        code: 200,
        codeMsg: 'ok',
        members: [...this.allMembers].map(([userId, member]) => {return {id: userId, name: member.name};})
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.userId, response);
    }
    public async handleQueryMemberOne(meetingMessage: constdomain.request_base) {
      let member = this.allMembers.get((meetingMessage as any).query_userId);
      if(!member) {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'member not found');
        return;
      }
      let response = {
        type: constdomain.kMsgResponse,
        reqId: meetingMessage.reqId,
        forType: constdomain.kMsgQueryMemberOne,
        code: 200,
        codeMsg: 'ok',
        member: member.toFullJson()
      } 
      await this.callServiceApi.sendResponeNeedAck(meetingMessage.userId, response);
    }
    public async handleUpdateMyStatus(meetingMessage: constdomain.request_base) {
      let member = this.members.get(meetingMessage.userId);
      if(!member) {
        await this.callServiceApi.sendRespMsg(meetingMessage, 404, 'member not found');
        return;
      }
      let hasChange = false;
      const micOn = (meetingMessage as any).micOn;
      const cameraOn = (meetingMessage as any).cameraOn;
      const mtInState = (meetingMessage as any).mtInState;
      if(micOn !== undefined&& micOn !== member.micOn) {
        member.micOn = micOn;
        hasChange = true;
      }
      if(cameraOn !== undefined&& cameraOn !== member.cameraOn) {
        member.cameraOn = cameraOn;
        hasChange = true;
      }
      if(mtInState !== undefined&& mtInState !== member.mtInState) {
        member.mtInState = mtInState;
        hasChange = true;
      }
      await this.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
      if(hasChange) {
        this.broadcastMemberStatus(member, meetingMessage.userId);
      }
    }
    public async broadcastMemberStatus(infoMember: CallMember,excludeUser:string) {
      for (let [userId, member] of this.members) {
        if(userId !== excludeUser) {
          this.callServiceApi.sendReqNeedResp(userId, {
            type: constdomain.kMsgInfoUserStatus,
            reqId: constutil.makeid(),
            from: constdomain.kMqttTopicMeetingService,
            meetingId: this.meetingId,
            callId: member.callId,
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
  