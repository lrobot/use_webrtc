
// mqtt://test.mosquitto.org
// mqtt://vhbw.rbat.tk




export { kurentoUrl, mqttUrl } from './_constdomain';

export const kMqttTopicMeetingService = 'meeting/service';
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
