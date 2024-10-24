import * as constdomain from "./constdomain";
import constutil, { PromiseFifoQueue } from "./constutil";
import { CallGroup, CallMember, CallServiceApi } from "./call_base";
import * as meetingMediaApi from './mediaapi';




class VideoMediaPeer {
  endpoint:meetingMediaApi.MediaEndpoint|null = null;
  queue: PromiseFifoQueue = new PromiseFifoQueue();
  peerId: string;
  userData: {[key: string]: string} = {};
  cachedSdpAnswer: string = '';
  constructor(peerId:string) {
  this.peerId = peerId;
  }
  public async runInQueue(promise: ()=>Promise<any>) {
    this.queue.enqueue(promise);
  }
  setEndpoint(endpoint: meetingMediaApi.MediaEndpoint) {
    if(this.endpoint) {
      this.endpoint.release();
    }
    this.endpoint = endpoint;
  }
  release() {
    if(this.endpoint) {
      this.endpoint.release();
      this.endpoint = null;
    }
  }
  setUserData(key: string, value: string) {
    this.userData[key] = value;
  }
  getUserData(key: string): string {
    return this.userData[key];
  }
}

export class MeetingMemeber extends CallMember {
    pushPeer: VideoMediaPeer|null = null;
    pullPeers: Map<string, VideoMediaPeer> = new Map<string, VideoMediaPeer>();
    meetingGroup: MeetingGroup;
    constructor(callGroup: CallGroup, msg:any, mediaEndpoint: meetingMediaApi.MediaEndpoint) {
      super(callGroup, msg, mediaEndpoint);
      this.meetingGroup = callGroup as MeetingGroup;
    }
    async videoMediaSync() {
      if(!this.meetingGroup.video) {
        if(this.pushPeer) {
          try {
            this.pushPeer.release();
          } catch (error) {
            console.error('release pushPeer error', error);
          }
          this.pushPeer = null;
        }
        const tmpPullPeers = this.pullPeers;
        this.pullPeers = new Map<string, VideoMediaPeer>();
        for (let [_, pullPeer] of tmpPullPeers) {
          try {
            pullPeer.release();
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
      endpoint.setIceStateCallback(async (state:any) => {
      });
      endpoint.setMediaStateCallback(async (state:any) => {
      });
      return endpoint;
    }
    public async handleMediaPushMedia(meetingMessage: constdomain.call_pull_video) {
      if(!this.pushPeer){
        this.pushPeer = new VideoMediaPeer(this.userId);
      }
      this.pushPeer.runInQueue(async () => {
        await this._handleMediaPushMedia(meetingMessage);
      });
    }
    public async _handleMediaPushMedia(meetingMessage: constdomain.call_pull_video) {
      if(!this.pushPeer) return;
      const reqId = meetingMessage.reqId;
      const cacheReqId = this.pushPeer.getUserData('reqId');
      if(cacheReqId === reqId && this.pushPeer.cachedSdpAnswer) {
        await this.sendMediaReply(meetingMessage, 200, 'ok cached', this.pushPeer.cachedSdpAnswer);
        return;
      }
      let toReleaseEndpoint = null;
      try {
        const newEndpoint = await this.createVideoEndpointForUserId(this.userId);
        toReleaseEndpoint = newEndpoint;
        const sdpAnswer = await newEndpoint.processOffer(meetingMessage.sdpOffer);
        this.pushPeer.setEndpoint(newEndpoint);
        this.pushPeer.setUserData('reqId', reqId);
        this.pushPeer.cachedSdpAnswer = sdpAnswer;

        for(let [userId, member] of this.callGroup.members) {
          const meetingMember = member as MeetingMemeber;
          const pullPeer = meetingMember.pullPeers.get(this.userId);
          if(pullPeer && pullPeer.endpoint) {
            newEndpoint.connectSendTo(pullPeer.endpoint, 'VIDEO');
          }
        }
        await this.sendMediaReply(meetingMessage, 200, 'ok', sdpAnswer);
      } catch (error) {
        console.error('release pushPeer error', error);
        if(toReleaseEndpoint) {
          toReleaseEndpoint.release();
        }
      }
    }
    public async handleMediaPullMedia(meetingMessage: constdomain.call_pull_video) {
      var pullPeer = this.pullPeers.get(meetingMessage.peerId);
      if(!pullPeer) {
        pullPeer = new VideoMediaPeer(meetingMessage.peerId);
        this.pullPeers.set(meetingMessage.peerId, pullPeer);
      }
      if(pullPeer) {
        pullPeer.runInQueue(async () => {
          if(!pullPeer) return;
          await this._handleMediaPullMedia(pullPeer, meetingMessage);
        });  
      }
    }

    public async _handleMediaPullMedia(pullPeer:VideoMediaPeer, meetingMessage: constdomain.call_pull_video) {
      const reqId = meetingMessage.reqId;
      const cachedReqId =  pullPeer.getUserData('reqId');

      const peerMember = this.callGroup.members.get(meetingMessage.peerId) as MeetingMemeber;
      if(!peerMember) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peer not found');
        return;
      }
      if(reqId === cachedReqId) {
        await this.sendMediaReply(meetingMessage, 200, 'ok cached', pullPeer.cachedSdpAnswer);
        return;
      }
      try {
        const pullEndpont = await this.createVideoEndpointForUserId(meetingMessage.peerId);
        const sdpAnswer = await pullEndpont.processOffer(meetingMessage.sdpOffer);
        pullPeer.setEndpoint(pullEndpont);
        pullPeer.setUserData('reqId', reqId);
        pullPeer.cachedSdpAnswer = sdpAnswer;
        if(peerMember.pushPeer&&peerMember.pushPeer.endpoint) {
          peerMember.pushPeer.endpoint.connectSendTo(pullEndpont, 'VIDEO');
        }
        await this.sendMediaReply(meetingMessage, 200, 'ok', sdpAnswer);
      } catch (error) {
        console.error('createEndpoint error', error);
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 500, 'create media member error');
      }
    }
    public async handleMediaVideoIce(meetingMessage: constdomain.request_call_video_ice) {
      if(!meetingMessage.peerId) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'peerId not found');
        return;
      }
      if(meetingMessage.peerId === this.userId) {
        const icePeer = this.pushPeer;
        if(icePeer) {
          icePeer.runInQueue(async () => {
            await this._handleMediaVideoIce(icePeer,meetingMessage);
          });
        }
      } else {
        const icePeer = this.pullPeers.get(meetingMessage.peerId);
        if(icePeer) {
          icePeer.runInQueue(async () => {
            await this._handleMediaVideoIce(icePeer,meetingMessage);
          });
        }
      }
    }
    public async _handleMediaVideoIce(videoPeer: VideoMediaPeer, meetingMessage: constdomain.request_call_video_ice) {
      if(!videoPeer.endpoint) {
        await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 404, 'videoPeer.endpoint not found');
        return;
      }
      await this.callGroup.callServiceApi.sendRespMsg(meetingMessage, 200, 'ok');
      if(meetingMessage.ice.sdp && !meetingMessage.ice.candidate) {
        meetingMessage.ice.candidate = meetingMessage.ice.sdp;
      }
      videoPeer.endpoint.addIceCandidate(meetingMessage.ice);
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
          case constdomain.kCallJoin:
            await this._handleMessage(meetingMessage);
            this.broadcastMemberStatus(meetingMember, meetingMessage.userId);
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
  