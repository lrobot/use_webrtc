

//write a function style react component with arg: username, serverUrl, MinOn, CameraOn
// 
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IntercomAutoCall } from './intercomcall';

interface BatchCallOneCallProps {
    username: string;
    meetingId: string;
    // micOn: boolean;
    // cameraOn: boolean;
}

const BatchCallOneCall: React.FC<BatchCallOneCallProps> = ({
    username,
    meetingId,
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const intercomAutoCall = useMemo(() => new IntercomAutoCall(username, meetingId), [username, meetingId]);
    const [callStatus, setCallStatus] = useState<string>("");
    const [micOn, setMicOn] = useState<boolean>(false);
    const [speakerOn, setSpeakerOn] = useState<boolean>(true);

    const callRestart = () => {
        if (audioRef.current) {
            intercomAutoCall.callRestart(audioRef.current);
        }
    }
    const doMicOn = (micOn:boolean) => {
        setMicOn(micOn);
        intercomAutoCall.speechCtrl(micOn);
    }
    const doSpeakerOn = (speakerOn:boolean) => {
        setSpeakerOn(speakerOn);
        intercomAutoCall.setSpeakerOn(speakerOn);
    };
    useEffect(() => {
        console.log('useEffect callJoin');
        (async () => {
            const updateInternalStatus = (status: string) => {
                setCallStatus(status);
            };
            intercomAutoCall.onStatusUpdate(updateInternalStatus);
            if (audioRef.current) {
                await intercomAutoCall.callRestart(audioRef.current);
            }
        })();
        return () => {
            console.log('useEffect callJoin cleanup');
            //some cleanup
            (async ()=>{
                intercomAutoCall.callRecreate();
            })();
        };
    }, []);
    useEffect(() => {
        console.log('useEffect micOn', micOn);
        return ()=>{
            console.log('useEffect micOn cleanup', micOn);
        }
    }, [micOn]);

    useEffect(() => {
        console.log('useEffect speakerOn', speakerOn);
        return ()=>{
            console.log('useEffect speakerOn cleanup', speakerOn);
        }
    }, [speakerOn]);

    return (
        <div style={{ border: '1px solid black' }}>
            <div style={{ display: 'inline-block' }}>user:{username}</div>&nbsp;&nbsp;&nbsp;&nbsp;
            <div style={{ display: 'inline-block' }}>
            micOn:<input type="checkbox" checked={micOn} onChange={(e) => doMicOn(e.target.checked)}/>&nbsp;&nbsp;&nbsp;&nbsp;
            speakerOn:<input type="checkbox" checked={speakerOn} onChange={(e) => doSpeakerOn(e.target.checked)} />&nbsp;&nbsp;&nbsp;&nbsp;
            <a href="#" onClick={() => callRestart()}>Restart</a>&nbsp;&nbsp;&nbsp;&nbsp;
            </div>
            <div style={{ display: 'inline-block' }}>status:{callStatus}</div>&nbsp;&nbsp;
            <div><audio ref={audioRef} src="audio_file_url" autoPlay controls /> </div>
        </div>
    );
};

export default BatchCallOneCall;

