

import * as kurentoUtils from "kurento-utils"; 


export class KurentoClient {
    offerGenDone = false;
    webRtcPeer_: any;
    options_: any;
    fnOnIceCandidate_: any;
    onError_(...args: any[]) {
        console.error(args);
    }
    onIceCandidate(candidate:any) {
        console.log('Local candidat out' + JSON.stringify(candidate));
        if(this.fnOnIceCandidate_) {
            this.fnOnIceCandidate_(candidate)
        }
    }

    setFnOnIceCandidate(fn:any) {
        this.fnOnIceCandidate_ = fn;
    }

    AddIceCandidate(candidate:any) {
        console.log('Remote candidate add' + JSON.stringify(candidate));
        try {
            this.webRtcPeer_.addIceCandidate(candidate);            
        } catch (error) {
            console.error
        }

    }
    
    onError(error:any) {
        console.error(error);
    }


    constructor(videoInput:HTMLVideoElement|null=null, videoOutput:HTMLVideoElement|null=null) {
        console.log('KurentoClient created');
        this.options_ = {
            localVideo: videoInput,
            remoteVideo: videoOutput,
            onicecandidate : this.onIceCandidate.bind(this),
                  mediaConstraints: {
                      audio: true,
                      video: (videoInput==null&&videoOutput===null)?false:{
                          width: 320,
                          height: 240
                      }
                  }
          }
    }

    async createOffer() {
        return new Promise((resolve, reject)=>{
            const webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(this.options_, (error:any)=> {
                if(error) return this.onError(error);
            });
            webRtcPeer.peerConnection.onnegotiationneeded = ()=>{
                console.log('onnegotiationneeded');
        
                if(this.offerGenDone) {
                    // ice restart, renegotiation not supported by kuerneto: https://groups.google.com/g/kurento/c/bJ9-0weuv4E
                    // webRtcPeer.peerConnection.restartIce();
                    // webRtcPeer.generateOffer(()=>{});
                } else {
                    webRtcPeer.generateOffer((error:any, offerSdp:any) => {
                        if(error) {
                            this.onError(error);
                            reject(error);
                        } else {
                            resolve(offerSdp);
                        }
                    });
                    this.offerGenDone = true;
                }
            }
            webRtcPeer.peerConnection.oniceconnectionstatechange = (event:any)=> {
                console.log('oniceconnectionstatechange:', event.target.iceConnectionState, event);
                if(event.target.iceConnectionState == 'disconnected'|| event.target.iceConnectionState == 'failed') {
                    console.log('Restart ice');
                    webRtcPeer.peerConnection.restartIce();
                    // webRtcPeer.generateOffer(onOffer);
                }
            }
            webRtcPeer.peerConnection.ontrack = (event:any) =>{
                    console.log("ontrack", event);
                    // Connect remote source to local speakers
                
                    /* Chrome doesn't support remote audio streams in audio contexts....
                    var remote_source = audio_context.createMediaStreamSource(event.stream);
                    remote_source.connect(audio_context.destination);
                    // Use an audio element instead
                    */
                   try {
                    var audio_elem = document.getElementById("audio") as HTMLAudioElement;
                    if(audio_elem) {
                        // var audio_elem = document.getElementById("audio");
                        audio_elem.srcObject = event.streams[0];
                        document.body.appendChild(audio_elem);
                        audio_elem.controls = true;
                        audio_elem.play();                    
                    }
                   } catch (error) {
                    console.log("ontrack:err", error);
                   }
            }
            this.webRtcPeer_ = webRtcPeer;
        });
    }
    async setAnwer(sdpAnswer:any) {
        this.webRtcPeer_.processAnswer(sdpAnswer);
        return Promise.resolve();
    }

    async micCtrl(enable:boolean) {
        this.webRtcPeer_.peerConnection.getTransceivers().forEach((transceiver:any) => {
            if (transceiver.sender.track.kind === 'audio') {
                transceiver.sender.track.enabled = enable;
                // transceiver.direction = enable ? 'sendrecv' : 'inactive';
            }
        });
        return Promise.resolve();
    };
}