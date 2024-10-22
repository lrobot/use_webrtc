

const TopicMeetingService = "meeting/service";
// export const mqttUrl = 'wss://mqtt.zhddkuma/mq/mqtt';
const mqttUrl = 'wss://yjdd.lm-t.cn/mq/mqtt';
// export const mqttUrl = 'wss://srv.rbat.tk:8081';


class AppConfig {
    fixedMeetingTopic = TopicMeetingService;
    logCreate = false;
    logIce = false;
    logMqtt = true;
    topicMeetingService = TopicMeetingService;
    mqttUrl = mqttUrl;
}

export const appConfig = new AppConfig();
