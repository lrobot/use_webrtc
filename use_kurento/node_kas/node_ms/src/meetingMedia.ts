

import * as meetingMediaApi from './meetingMediaApi';

import * as meetingMediaKurento from './meetingMediaKurento';

export function getMeetingCenterKurento(kurentoUrl: string): meetingMediaApi.MediaCenter {
    return new meetingMediaKurento.MediaCenterKurento(kurentoUrl);
}

export function getMeetingMediaMediasoup(mediaSoupUrl:string): meetingMediaApi.MediaCenter {
    return getMeetingCenterKurento(mediaSoupUrl);  //temp example
}