
// mqtt://test.mosquitto.org
// mqtt://vhbw.rbat.tk




export { kurentoUrl, mqttUrl } from './_constdomain';

export const kMqttTopicMeetingService = 'meeting/service1';
export const kMqttTopicUserPrefix = 'user/';



export const kBusTypeMeeting = 'meeting';

export const kCallInvite = 'call_invite';
export const kCallJoin = 'call_join';
export const kCallLeave = 'call_leave';
export const kCallIce = 'call_ice';
export const kIntercomQuery = 'intercom_query';
export const kIntercomStatus = 'intercom_status';
export const kIntercomSpeechCtrl = 'intercom_speechctrl';
export const kMsgResponse = 'response';
export const kMsgAck = 'ack';

export const kMsgQueryMemberOnline = 'query_member_online';
export const kMsgQueryMemberAll = 'query_member_all';
export const kMsgQueryMemberOne = 'query_member_one';
export const kMsgUpdateMyStatus = 'update_my_status';
export const kMsgInfoUserStatus = 'info_user_status';
export const kMsgInfoMeetingStatus = 'info_meeting_status';
export const kMsgMeetingCtrl = 'meeting_ctrl';
export const kMsgMediaPushVideo = 'call_push_video';
export const kMsgMediaPullVideo = 'call_pull_video';
export const kMsgMediaVideoIce = 'call_video_ice';

export const kCallTypeIntercom = 'intercom';
export const kCallTypeMeeting = 'meeting';


export interface message_base {
  type: string;
  bus_type: string
  req_id: string;
  from: string;
  to: string;
  meeting_id: string;
}

export interface request_base extends message_base {
  call_id: string;
  user_id: string;
  //need_resp: boolean;
}

export interface respone_base extends message_base {
  for_type: string; //type:response,for define response for which request
  code: number;
  code_msg: string;
  need_ack: boolean;
}

export interface call_join_request extends request_base {
  sdp_offer:string
}

export interface call_join_response extends respone_base{
  sdp_answer:string
}

export interface intercom_speechctrl extends request_base {
  speech_on: boolean;
  force: boolean;
  user_speech_level: number;
}

export interface intercom_status_req extends request_base {
  current_speaker_user: string;
  current_status_cnt: number;
  current_speaker_level: number;
}

export interface intercom_status_resp extends respone_base {
  current_speaker_user: string;
  current_status_cnt: number;
  current_speaker_level: number;
}


export interface intercom_ice extends request_base {
  ice: any; //json candidate
}

export interface call_pull_media extends request_base {
  peer_id: string;
  sdp_offer: any; //json candidate
}

export interface call_pull_media_response extends respone_base {
  peer_id: string;
  sdp_answer: any; //json candidate
}

export interface call_pull_ice extends request_base {
  peer_id: string;
  ice: any; //json candidate
}
