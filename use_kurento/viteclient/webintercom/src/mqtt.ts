


import mqtt from "mqtt"; // import namespace "mqtt"
import { makeid } from "./util";
// export const mqttUrl = 'wss://mqtt.zhddkuma/mq/mqtt';
export const mqttUrl = 'wss://yjdd.lm-t.cn/mq/mqtt';
// export const mqttUrl = 'wss://srv.rbat.tk:8081';


export class MqttClient {
    client: mqtt.MqttClient;
    clientConnected = false;
    userOnMessageMap: Map<string, (message:string)=>void> = new Map();
    constructor() {
        console.log("mqttUrl", mqttUrl);
        this.client = mqtt.connect(mqttUrl); // create a client
        this.client.on("message", (topic, message) => {
            const username = topic.replace("user/", "");
            if(this.userOnMessageMap.has(username)){
                console.log("mqtt_in_ ",topic, message.toString());
                this.userOnMessageMap.get(username)!(message.toString());
            } else {
                console.log("mqtt_in_no_user", username, message.toString());
            }
        });
        this.client.on("connect", () => {
            this.clientConnected = true;
            console.log("mqtt_connect ok", mqttUrl);
            for(const [username, messageCalback] of this.userOnMessageMap) {
                this.client.subscribe(this.getUserTopic(username), (err) => {
                    if (!err) {
                        this.clientPublish(this.getUserTopic(username), JSON.stringify({ message: "Hello from mqtt" }));
                    } else {
                        console.log("mqtt_subscribe_err", this.getUserTopic(username), err);
                    }
                });
            }
          })
        this.client.on("error", (err) => {
            this.clientConnected = false;
            console.log("mqtt_error", mqttUrl, err);
        });
        this.client.on("disconnect", () => {
            this.clientConnected = false;
            console.log("mqtt_disconnect", mqttUrl);
        });
    }
    addUser(username:string, messageCalback:(message:string)=>void) {
        this.userOnMessageMap.set(username, messageCalback);
        if(this.clientConnected) {
            this.client.subscribe(this.getUserTopic(username));
        }
    }
    removeUser(username:string) {
        this.userOnMessageMap.delete(username);
        if(this.clientConnected) {
            this.client.unsubscribe(this.getUserTopic(username));
        }
    }
    clientPublish(topic:string, message:string) {
        console.log("mqtt_out_", topic, message);
        this.client.publish(topic, message);
    }
    getUserTopic(username:string) {
        return "user/" + username;
    }
}



export const mqttClient = new MqttClient();