import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'
import { mqttClient } from './mqtt'
import BatchCallOneCall from './batchcallonecall'
import { appConfig } from './appconfig'


function App() {
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

    return (
        <div>
            <div>
            MeetingServiceTopic:<input type="text" value={meetingServiceTopic} onChange={handleMeetingServiceTopicChange} placeholder="MeetingServiceTopic" />meeting/service<br/>
            MeetingId:<input type="text" value={meetingId} onChange={handleMeetingIdChange} placeholder="MeetingId" />zx: 1717124053083953828, 分群组1: 1717136443577957444<br/>
            UserPrefix:<input type="text" value={usernamePrefix} onChange={handleUsernamePrefixChange} placeholder="Username Prefix" /><br/>
            TestCount:<input type="number" value={count} onChange={handleCountChange} placeholder="Count" /><br/>
            <button onClick={handleStartClick}>{testOn?"stop":"start"}</button>
            </div>
            {testOn && Array.from({ length: count }, (_, index) => (
                <BatchCallOneCall key={index} username={`${usernamePrefix}${index}`} meetingId={meetingId} />
            ))}
        </div>
    )
}

export default App
