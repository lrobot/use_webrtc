

import kurento from 'kurento-client';
import * as meetingMediaApi from './mediaapi';
import QKurento from './qkurento';
import * as constdomain from './constdomain';



const enableVideo = false;

export class MediaEndpointKurento implements meetingMediaApi.MediaEndpoint {
  userData: {[key: string]: string} = {};
  constructor(mediaGroup:MediaGroupKurento, webrtcEndpoint: kurento.WebRtcEndpoint, hubPort: kurento.HubPort|null) {
    this.mediaGroup = mediaGroup;
    this.webrtcEndpoint = webrtcEndpoint;
    this.hubPort = hubPort;
    this.webrtcEndpoint.on('IceCandidateFound', (event) => {
      let candidate = kurento.getComplexType('IceCandidate')(event.candidate);
      // console.log('IceCandidateFound', candidate);
      if(this.iceCandidateCallback !== null) {
        this.iceCandidateCallback(candidate);
      }
    });
    (this.webrtcEndpoint as any).on('IceComponentStateChanged', (event:any) => {
      // console.log('IceComponentStateChange', event.state);
      if(this.iceStateCallback !== null) {
        this.iceStateCallback(event);
      }
    });
    this.webrtcEndpoint.on('MediaStateChanged', (event) => {
      console.log('MediaStateChanged', event);
      if(this.mediaStateCallback !== null) {
        this.mediaStateCallback(event);
      }
    })
  }
  setUserData(key: string, value: string) {
    this.userData[key] = value;
  }
  getUserData(key: string): string {
    return this.userData[key];
  }
  async addIceCandidate(candidate: any):Promise<void> {
      var candidateInfo = null;
      try {
        console.log('getComplexType', candidate);
        candidateInfo = kurento.getComplexType("IceCandidate")(candidate);
      } catch (e) {
        console.error("Error parsing candidate", candidate, e);
        return;
      }
      if(this.sdpAnswer === null) {
        this._iceCache.push(candidateInfo);
      } else {
        try {
          console.log('addIceCandidate', candidateInfo);
          await this.webrtcEndpoint.addIceCandidate(candidateInfo);
        } catch (e) {
          console.error("Error adding candidate", candidateInfo, e);
        }
      }
  }
  setIceCandidateCallback(callback: (candidate: string) => void): void {
    this.iceCandidateCallback = callback;
  }
  setIceStateCallback(callback: (state: any) => void): void {
    this.iceStateCallback = callback;
  }
  setMediaStateCallback(callback: (state: any) => void): void {
    this.mediaStateCallback = callback;
  }
  mediaStateCallback: ((state: any) => void )|null= null
  iceStateCallback: ((state: any) => void )|null= null
  iceCandidateCallback: ((candidate: string) => void )|null= null;
  sdpAnswer: string|null = null;
  _iceCache: any[] = [];
  mediaGroup: MediaGroupKurento
  webrtcEndpoint: kurento.WebRtcEndpoint
  hubPort: kurento.HubPort|null
  releaseDone = false;
  getMediaCenter(): meetingMediaApi.MediaCenter {
    return this.mediaGroup.mediaCenterKurento;
  }
  getMediaGroup(): meetingMediaApi.MediaGroup {
    return this.mediaGroup;
  }
  release(): void {
    if(this.releaseDone) {
      return;
    }
    this.releaseDone = true;
    this.webrtcEndpoint.release();
    if(this.hubPort !== null){
      this.hubPort.release();
    }
  }
  async processOffer(sdpOffer: string):Promise<string> {
    this.sdpAnswer = await this.webrtcEndpoint.processOffer(sdpOffer);
    await this.webrtcEndpoint.gatherCandidates();
    this._iceCache.forEach(async (candidateInfo) => {
      await this.webrtcEndpoint.addIceCandidate(candidateInfo);
    });
    return this.sdpAnswer;
  }
  hasSdpAnswer(): boolean {
    return this.sdpAnswer !== null;
  }
  getSdpAnswer(): string {
    if(this.sdpAnswer === null) {
      throw new Error('sdpAnswer is null');
    }
    return this.sdpAnswer;
  }
  async _connectHubport() {
    if(this.hubPort) {
      await this.webrtcEndpoint.connect(this.hubPort, 'AUDIO');
      await this.hubPort.connect(this.webrtcEndpoint, 'AUDIO');
    }
    if(this.mediaGroup.videoOutputHubPort !== null) {
      this.mediaGroup.videoOutputHubPort.connect(this.webrtcEndpoint, 'VIDEO');
    }
    var maxbps = Math.floor( 320 * 1024);
    // (this.webrtcEndpoint as any).getMaxEncoderBitrate(maxbps);
  }
  async connectSendTo(endpoint: meetingMediaApi.MediaEndpoint, mediaType:string): Promise<void> {
    if(endpoint instanceof MediaEndpointKurento) {
      await this.webrtcEndpoint.connect(endpoint.webrtcEndpoint, mediaType as kurento.MediaType);
    } else {
      throw new Error('not supported');
    }
  }
}

export class MediaGroupKurento implements meetingMediaApi.MediaGroup {
  mediaCenterKurento: MediaCenterKurento
  pipeline: kurento.MediaPipeline
  composite: kurento.Composite|null = null;
  videoOutputHubPort: kurento.HubPort|null = null;
  releaseDone = false;

  constructor(mediaCenterKurento: MediaCenterKurento, pipeline: kurento.MediaPipeline, composite: kurento.Composite|null) {
    this.mediaCenterKurento = mediaCenterKurento;
    this.composite = composite;
    this.pipeline = pipeline;
  }
  release(): void {
    if(this.releaseDone) {
      return;
    }
    this.releaseDone = true;
    this.pipeline.release();
    if(this.composite !== null){
      this.composite.release();
    }
  }
  getMediaCenter(): meetingMediaApi.MediaCenter {
    return this.mediaCenterKurento;
  }
  async createEndpoint(): Promise<meetingMediaApi.MediaEndpoint> {
    if(this.composite) {
      if(enableVideo && this.videoOutputHubPort === null) {
        this.videoOutputHubPort = await this.composite.createHubPort();
      }
      const mediaEndpoint = new MediaEndpointKurento(this, await this.pipeline.create('WebRtcEndpoint'), await this.composite.createHubPort());
      await mediaEndpoint._connectHubport();
      return mediaEndpoint;
    } else {
      const mediaEndpoint = new MediaEndpointKurento(this, await this.pipeline.create('WebRtcEndpoint'), null);
      await mediaEndpoint._connectHubport();
      return mediaEndpoint;
    }
  }
  async releaseMember() {
    if(this.videoOutputHubPort !== null) {
      this.videoOutputHubPort.release();
      this.videoOutputHubPort = null;
    }
  }
}
export class MediaCenterKurento implements meetingMediaApi.MediaCenter {
  kurent: QKurento
  constructor(kurentoUrl: string) {
    this.kurent = new QKurento(kurentoUrl);
  }
  async createGroup(useCompose:boolean): Promise<meetingMediaApi.MediaGroup> {
    const pipeLine = await this.kurent.createMediaPipeline();
    const composite = useCompose ? await this.kurent.createComposite(pipeLine) : null;
    return new MediaGroupKurento(this, pipeLine , composite)
  }
}

