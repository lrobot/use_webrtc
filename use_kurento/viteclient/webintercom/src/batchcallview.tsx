import { useEffect, useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'
import BatchCallOneCall from './batchcallonecall'
import { appConfig } from './appconfig'
import { md5 } from 'js-md5'
import { mqttClient } from './mqtt'

const usagePassword_md5_md5 = "d7364e00ff0d158a2819d0604f3b1f98"

function BactchCallView() {
    const [mqttState, setMqttState] = useState(mqttClient.clientStatus);
    const [usernamePrefix, setUsernamePrefix] = useState('test')
    const [meetingServiceTopic, setMeetingServiceTopic] = useState(appConfig.fixedMeetingTopic)
    const [meetingId, setMeetingId] = useState('1234567890')
    const [count, setCount] = useState(1)
    const [testOn, setTestOn] = useState(false)

    const handleMeetingServiceTopicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMeetingServiceTopic(event.target.value)
        appConfig.topicMeetingService = event.target.value
    }

    const handleMeetingIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMeetingId(event.target.value)
    }

    const handleUsernamePrefixChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUsernamePrefix(event.target.value)
    }

    const handleCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCount(Number(event.target.value))
    }

    const handleStartClick = () => {
        setTestOn(!testOn)
    }
    useEffect(() => {
        mqttClient.mqttStateCallBack = (state: string) => {
            setMqttState(state);
        }
    });

    return (
        <div>
            <div>
            mqttState:{mqttState}<br/>
            meetingServiceTopic:<input type="text" value={meetingServiceTopic} onChange={handleMeetingServiceTopicChange} placeholder="MeetingServiceTopic" />meeting/service<br/>
            meetingId:<input type="text" value={meetingId} onChange={handleMeetingIdChange} placeholder="MeetingId" />zx: 1717124053083953828, 分群组1: 1717136443577957444<br/>
            userPrefix:<input type="text" value={usernamePrefix} onChange={handleUsernamePrefixChange} placeholder="Username Prefix" /><br/>
            testCount:<input type="number" value={count} onChange={handleCountChange} placeholder="Count" /><br/>
            <button onClick={handleStartClick}>{testOn?"stop":"start"}</button>
            </div>
            {testOn && Array.from({ length: count }, (_, index) => (
                <BatchCallOneCall key={index} username={`${usernamePrefix}${index}`} meetingId={meetingId} />
            ))}
        </div>
    )
}



function App() {
    const [passwordOk, setPasswordOk] = useState(false);
    const handlePasswordChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log("password changed", event.target.value);
        const pmd5 = md5(event.target.value);
        localStorage.setItem("passwordMd5", pmd5);
        const pmd5md5 = md5(pmd5);
        // console.log("md5md5 compare:", pmd5md5, usagePassword_md5_md5);
        if(pmd5md5==usagePassword_md5_md5) {
            setPasswordOk(true);
        }
    }
    useEffect(() => {
        const pmd5 = localStorage.getItem("passwordMd5");
        if(pmd5) {
            if(md5(pmd5)==usagePassword_md5_md5) {
                setPasswordOk(true);
            }        
        }
    });
    const doLogout = () => {
        localStorage.setItem("passwordMd5", "");
        setPasswordOk(false);
    }
    if(passwordOk){
        return (
            <div>
                <a href="#" onClick={() => doLogout()}>Logout</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <BactchCallView />
            </div>
        )
    } else {
        return (
            <div>
            <h1>Please input password</h1>
            <input type="text" onChange={handlePasswordChanged} name="usagePassword" /><br/>
            </div>
        )
    }
}




export default App
