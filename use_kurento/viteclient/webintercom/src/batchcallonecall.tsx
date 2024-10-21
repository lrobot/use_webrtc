

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
    // micOn
    // cameraOn,
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const intercomAutoCall = useMemo(() => new IntercomAutoCall(username, meetingId), [username, meetingId]);
    const [callStatus, setCallStatus] = useState<string>("");

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
            intercomAutoCall.release();
        };
    }, []);

    // useEffect(() => {
    //     if (audioRef.current) {
    //         intercomAutoCall.callJoin(audioRef.current);
    //     }
    // }, []);

    return (
        <div>
            <div>username:{username}</div>
            <div>Call Status:{callStatus}</div>
            <audio ref={audioRef} src="audio_file_url" controls />
        </div>
    );
};

export default BatchCallOneCall;

