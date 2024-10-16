

export interface MediaEndpoint {
  getMediaGroup(): MediaGroup;
  getMediaCenter(): MediaCenter;
  release(): void;
  setIceCandidateCallback(callback: (candidate: string) => void): void;
  setIceStateCallback(callback: (state: string) => void): void;
  addIceCandidate(candidate: any): Promise<void>;
  processOffer(sdpOffer: string): Promise<string>;
  hasSdpAnswer(): boolean;
  getSdpAnswer(): string;
  setUserData(key: string, value: string): void;
  getUserData(key: string): string;
  connectSendTo(endpoint: MediaEndpoint, mediaType:string): Promise<void>;
}


export interface MediaGroup {
  createEndpoint(): Promise<MediaEndpoint>;
  getMediaCenter(): MediaCenter;
  release(): void;
}


export interface MediaCenter {
  createGroup(useCompose:boolean): Promise<MediaGroup>;
}

