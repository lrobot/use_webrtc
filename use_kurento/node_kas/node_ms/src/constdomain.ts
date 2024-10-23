
// mqtt://test.mosquitto.org
// mqtt://vhbw.rbat.tk




export { kurentoUrl, mqttUrl } from './_constdomain';

export const kMqttTopicMeetingService = 'meeting/service1';
export const kMqttTopicUserPrefix = 'user/';



export const kBusTypeMeeting = 'meeting';

export const kCallInvite = 'callInvite';
export const kCallJoin = 'callJoin';
export const kCallLeave = 'callLeave';
export const kCallIce = 'callIce';
export const kIntercomQuery = 'intercomQuery';
export const kIntercomStatus = 'intercomStatus';
export const kIntercomSpeechCtrl = 'intercomSpeechCtrl';
export const kMsgResponse = 'response';
export const kMsgAck = 'ack';
export const kMsgPing = 'ping';
export const kMsgPong = 'pong';

export const kMsgQueryMemberOnline = 'queryMemberOnline';
export const kMsgQueryMemberAll = 'queryMemberAll';
export const kMsgQueryMemberOne = 'queryMemberOne';
export const kMsgUpdateMyStatus = 'updateMyStatus';
export const kMsgInfoUserStatus = 'infoUserStatus';
export const kMsgInfoMeetingStatus = 'infoMeetingStatus';
export const kMsgMeetingCtrl = 'meetingCtrl';
export const kMsgMediaPushVideo = 'callPushVideo';
export const kMsgMediaPullVideo = 'callPullVideo';
export const kMsgMediaVideoIce = 'callVideoIce';

export const kCallTypeIntercom = 'intercom';
export const kCallTypeMeeting = 'meeting';

export const kDefaultSpeechLevel = 999;

export interface message_base {
  type: string;
  buType: string
  reqId: string;
  from: string;
  to: string;
  meetingId: string;
}

export interface request_base extends message_base {
  callId: string;
  userId: string;
  //needResp: boolean;
}

export interface respone_base extends message_base {
  forType: string; //type:response,for define response for which request
  code: number;
  codeMsg: string;
  needAck: boolean;
}

export interface call_join_request extends request_base {
  sdpOffer:string
}

export interface call_join_response extends respone_base{
  sdpAnswer:string
}

export interface request_intercom_speech_ctrl extends request_base {
  speechOn: boolean;
  force: boolean;
  userSpeechLevel: number;
}

export interface intercom_status_req extends request_base {
  currentSpeakerUser: string;
  currentStatusCnt: number;
  currentSpeakerLevel: number;
}

export interface intercom_status_resp extends respone_base {
  currentSpeakerUser: string;
  currentStatusCnt: number;
  currentSpeakerLevel: number;
}


export interface intercom_ice extends request_base {
  ice: any; //json candidate
}

export interface call_pull_video extends request_base {
  peerId: string;
  sdpOffer: any; //json candidate
}

export interface call_pull_video_response extends respone_base {
  peerId: string;
  sdpAnswer: any; //json candidate
}

export interface request_call_video_ice extends request_base {
  peerId: string;
  ice: any; //json candidate
}
