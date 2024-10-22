

const TopicMeetingService = "meeting/service";
// export const mqttUrl = 'wss://mqtt.zhddkuma/mq/mqtt';
export const mqttUrl = 'wss://yjdd.lm-t.cn/mq/mqtt';
// export const mqttUrl = 'wss://srv.rbat.tk:8081';


class AppConfig {
    logCreate = false;
    logIce = false;
    logMqtt = true;
    topicMeetingService = TopicMeetingService;
    mqttUrl = mqttUrl;
}

export const appConfig = new AppConfig();
