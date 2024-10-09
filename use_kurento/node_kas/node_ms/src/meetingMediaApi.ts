

export interface MediaMember {
  getMediaGroup(): MediaGroup;
  getMediaCenter(): MediaCenter;
  release(): void;
  setIceCandidateCallback(callback: (candidate: string) => void): void;
  addIceCandidate(candidate: any): Promise<void>;
  processOffer(sdp_offer: string): Promise<string>;
}


export interface MediaGroup {
  createMember(): Promise<MediaMember>;
  getMediaCenter(): MediaCenter;
  release(): void;
}


export interface MediaCenter {
  createGroup(): Promise<MediaGroup>;
}

