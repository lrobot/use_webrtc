


// import freeice from 'freeice'
import { appConfig } from './appconfig';

export class WrtcClient {
    offerGenDone = false;
    webrtcPc: RTCPeerConnection;
    fnOnIceCandidate_: any;
    setAnswerDone = false;
    iceCandidateCache: any[] = [];
    onIceStateChange: (state:string) => void = () => {};
    onError_(...args: any[]) {
        console.error(args);
    }
    onIceCandidate(candidate:any) {
        // console.log('Local candidat out' + JSON.stringify(candidate));
        if(this.fnOnIceCandidate_) {
            this.fnOnIceCandidate_(candidate)
        }
    }
    setOnIceStateChange(fn: (state:string) => void) {
        this.onIceStateChange = fn;
    }
    setFnOnIceCandidate(fn:any) {
        this.fnOnIceCandidate_ = fn;
    }

    AddIceCandidate(candidate:any) {
        // console.log('Remote candidate add:' + JSON.stringify(candidate));
        try {
            if(!this.setAnswerDone) {
                this.iceCandidateCache.push(candidate);
            } else {
                this.webrtcPc.addIceCandidate(candidate);            
            }

        } catch (error) {
            console.error
        }

    }
    
    onError(error:any) {
        console.error(error);
    }


    constructor() {
        if(appConfig.logCreate) {
            console.log('wrtc created');
        }
        this.webrtcPc = new RTCPeerConnection({
            iceServers:  [
            // { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:171.220.244.122:3478' },
            { urls: 'turn:171.220.244.122:3478', username: 'kurento',credential: 'kurento'}
            ]
            // .concat(freeice())
            ,
            iceTransportPolicy: 'all',
        });
    }

    async createOffer(audioElem:HTMLAudioElement) {
        return new Promise(async (resolve, reject)=>{
            let pc = this.webrtcPc;
            pc.onicecandidate = (event:any) => {
                if(event.candidate) {
                    this.onIceCandidate(event.candidate);
                } else {
                    console.log('onicecandidate: end of candidates');
                }
            };
            pc.ontrack = (event:any) => {
                console.log("ontrack", event);
                if(event.track.kind !== 'audio') return;
               try {
                // userDiv.getElementsByTagName("audio")[0].srcObject = event.streams[0];
                // var audio_elem = document.getElementById("audio") as HTMLAudioElement;
                if(audioElem) {
                    if(audioElem.srcObject !== event.streams[0]) {
                        audioElem.srcObject = event.streams[0]
                        console.log('ontrack Received remote stream');
                    }
                    // audio_elem.controls = true;
                    // audio_elem.play();        
                }
               } catch (error) {
                console.log("ontrack:err", error);
               }
            }
            pc.onnegotiationneeded = ()=>{
                console.log('onnegotiationneeded');
        
                if(this.offerGenDone) {
                    // ice restart, renegotiation not supported by kuerneto: https://groups.google.com/g/kurento/c/bJ9-0weuv4E
                    // webRtcPeer.peerConnection.restartIce();
                    // webRtcPeer.generateOffer(()=>{});
                } else {
                    pc.createOffer().then((offer)=>{
                        pc.setLocalDescription(offer).then(()=>{
                            console.log('offer', offer.sdp);
                            resolve(offer.sdp);
                        }).catch((error:any)=>{
                            console.error('setLocalDescription', error);
                            reject(error);
                        });
                    }).catch((error:any)=>{
                        console.error('createOffer', error);
                        reject(error);
                    });
                    this.offerGenDone = true;
                }
            }
            pc.oniceconnectionstatechange = (event:any) => {
                console.log('oniceconnectionstatechange:', event.target.iceConnectionState, event);
                if(this.onIceStateChange) {
                    this.onIceStateChange('mss_' + event.target.iceConnectionState);
                }
                if(event.target.iceConnectionState == 'disconnected'|| event.target.iceConnectionState == 'failed') {
                    console.log('Restart ice');
                    pc.restartIce();
                    // webRtcPeer.generateOffer(onOffer);
                }

            }

            try {
                const localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false
                })
                localStream.getTracks().forEach((track:any) => {
                    pc.addTrack(track, localStream);
                });

                // this.offerGenDone = true;
                // const sdpOffer = await pc.createOffer({
                //     offerToReceiveAudio: true,
                //     offerToReceiveVideo: false,
                //     // voiceActivityDetection: false
                // })

                // await pc.setLocalDescription(sdpOffer);
                // resolve(sdpOffer.sdp);
            } catch (error) {
                reject(error);
            }
        });
    }
    async setAnswer(sdpAnswer:any) {
        try {
            await this.webrtcPc.setRemoteDescription({sdp: sdpAnswer, type: 'answer'});
            this.setAnswerDone = true;
            this.iceCandidateCache.forEach(async (candidate:any) => {
                await this.webrtcPc.addIceCandidate(candidate);
            });
        } catch (error) {
            console.error('setRemoteDescription', error);
        }
    }

    async micCtrl(enable:boolean) {
        this.webrtcPc.getTransceivers().forEach((transceiver:RTCRtpTransceiver) => {
            // console.log('transceiver', JSON.stringify(transceiver));
            if(!transceiver.sender) return;
            if(!transceiver.sender.track) return;
            if (transceiver.sender.track.kind === 'audio') {
                // console.log('micCtrl done', enable);
                transceiver.sender.track.enabled = enable;
            }
        });
        return Promise.resolve();
    };
    async setSpeakerOn(speakerOn:boolean) {
        this.webrtcPc.getTransceivers().forEach((transceiver:RTCRtpTransceiver) => {
            // console.log('transceiver', JSON.stringify(transceiver));
            if(!transceiver.receiver) return;
            if(!transceiver.receiver.track) return;
            if (transceiver.receiver.track.kind === 'audio') {
                // console.log('speakerOn done', speakerOn);
                transceiver.receiver.track.enabled = speakerOn;
            }
        });
    }
}