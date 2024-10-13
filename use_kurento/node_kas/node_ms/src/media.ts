

import * as meetingMediaApi from './mediaapi';

import * as meetingMediaKurento from './media_kurento';

export function getMeetingCenterKurento(kurentoUrl: string): meetingMediaApi.MediaCenter {
    return new meetingMediaKurento.MediaCenterKurento(kurentoUrl);
}

export function getMeetingMediaMediasoup(mediaSoupUrl:string): meetingMediaApi.MediaCenter {
    return getMeetingCenterKurento(mediaSoupUrl);  //temp example
}