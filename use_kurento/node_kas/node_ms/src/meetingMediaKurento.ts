

import kurento from 'kurento-client';
import * as meetingMediaApi from './meetingMediaApi';
import QKurento from './qkurento';
import * as constdomain from './constdomain';


export class MediaMemberKurento implements meetingMediaApi.MediaMember {
  constructor(mediaGroup:MediaGroupKurento, webrtcEndpoint: kurento.WebRtcEndpoint, hubPort: kurento.HubPort) {
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
  }
  async addIceCandidate(candidate: any) {
      
      var candidateInfo = null;
      try {
        console.log('getComplexType', candidate);
        candidateInfo = kurento.getComplexType("IceCandidate")(candidate);
      } catch (e) {
        console.error("Error parsing candidate", candidate, e);
        return;
      }
      if(this.sdp_answer === null) {
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
  iceCandidateCallback: ((candidate: string) => void )|null= null;
  sdp_answer: string|null = null;
  _iceCache: any[] = [];
  mediaGroup: MediaGroupKurento
  webrtcEndpoint: kurento.WebRtcEndpoint
  hubPort: kurento.HubPort
  getMediaCenter(): meetingMediaApi.MediaCenter {
    return this.mediaGroup.mediaCenterKurento;
  }
  getMediaGroup(): meetingMediaApi.MediaGroup {
    return this.mediaGroup;
  }
  release(): void {
    this.webrtcEndpoint.release();
    this.hubPort.release();
  }
  async processOffer(sdp_offer: string):Promise<string> {
    this.sdp_answer = await this.webrtcEndpoint.processOffer(sdp_offer);
    await this.webrtcEndpoint.gatherCandidates();
    this._iceCache.forEach(async (candidateInfo) => {
      await this.webrtcEndpoint.addIceCandidate(candidateInfo);
    });
    return this.sdp_answer;
  }
  public async connect() {
    await this.webrtcEndpoint.connect(this.hubPort);
    await this.hubPort.connect(this.webrtcEndpoint, 'AUDIO');
    if(this.mediaGroup.videoOutputHubPort !== null) {
      this.mediaGroup.videoOutputHubPort.connect(this.webrtcEndpoint, 'VIDEO');
    }
    var maxbps = Math.floor( 320 * 1024);
    // (this.webrtcEndpoint as any).getMaxEncoderBitrate(maxbps);
  }
}

export class MediaGroupKurento implements meetingMediaApi.MediaGroup {
  mediaCenterKurento: MediaCenterKurento
  pipeline: kurento.MediaPipeline
  composite: kurento.Composite
  videoOutputHubPort: kurento.HubPort|null = null;

  constructor(mediaCenterKurento: MediaCenterKurento, pipeline: kurento.MediaPipeline, composite: kurento.Composite) {
    this.mediaCenterKurento = mediaCenterKurento;
    this.composite = composite;
    this.pipeline = pipeline;
  }
  release(): void {
    this.pipeline.release();
    this.composite.release();
  }
  getMediaCenter(): meetingMediaApi.MediaCenter {
    return this.mediaCenterKurento;
  }
  async createMember(): Promise<meetingMediaApi.MediaMember> {
    if(this.videoOutputHubPort === null) {
      this.videoOutputHubPort = await this.composite.createHubPort();
    }
    const mediaMember = new MediaMemberKurento(this,
      await this.pipeline.create('WebRtcEndpoint'),
      await this.composite.createHubPort());
    await mediaMember.connect();
    return mediaMember;
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
  async createGroup(): Promise<meetingMediaApi.MediaGroup> {
    const pipeLine = await this.kurent.createMediaPipeline();
    return Promise.resolve(new MediaGroupKurento(this, pipeLine , await this.kurent.createComposite(pipeLine)));
  }
}

