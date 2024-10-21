

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
    useEffect(() => {
        const updateInternalStatus = (status: string) => {
            setCallStatus(status);
        };
        intercomAutoCall.onStatusUpdate(updateInternalStatus);
        if (audioRef.current) {
            intercomAutoCall.callJoin(audioRef.current);
        }
        return () => {
            //some cleanup
            // intercomAutoCall.release();
        };
    }, []);
    useEffect(() => {
        intercomAutoCall.speechCtrl(micOn);
    }, [micOn]);
    useEffect(() => {
        intercomAutoCall.setSpeakerOn(speakerOn);
    }, [speakerOn]);

    return (
        <div style={{ border: '1px solid black' }}>
            <div style={{ display: 'inline-block' }}>user:{username}</div>&nbsp;&nbsp;&nbsp;&nbsp;
            <div style={{ display: 'inline-block' }}>
            micOn:<input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)}/>&nbsp;&nbsp;&nbsp;&nbsp;
            speakerOn:<input type="checkbox" checked={speakerOn} onChange={(e) => setSpeakerOn(e.target.checked)} />&nbsp;&nbsp;&nbsp;&nbsp;
            <a href="#" onClick={() => callRestart()}>Restart</a>&nbsp;&nbsp;&nbsp;&nbsp;
            </div>
            <div style={{ display: 'inline-block' }}>status:{callStatus}</div>&nbsp;&nbsp;
            <div><audio ref={audioRef} src="audio_file_url" controls /> </div>
        </div>
    );
};

export default BatchCallOneCall;

