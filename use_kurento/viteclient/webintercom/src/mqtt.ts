


import mqtt from "mqtt"; // import namespace "mqtt"
import { appConfig } from "./appconfig";


export class MqttClient {
    client: mqtt.MqttClient;
    clientConnected = false;
    userOnMessageMap: Map<string, (message:string)=>void> = new Map();
    constructor() {
        console.log("mqttUrl", appConfig.mqttUrl);
        this.client = mqtt.connect(appConfig.mqttUrl); // create a client
        this.client.on("message", (topic, message) => {
            const username = topic.replace("user/", "");
            if(this.userOnMessageMap.has(username)){
                this.userOnMessageMap.get(username)!(message.toString());
            } else {
                console.log("mqtt_in_ no_user", username, message.toString());
            }
        });
        this.client.on("connect", () => {
            this.clientConnected = true;
            console.log("mqtt_connect ok", appConfig.mqttUrl);
            for(const [username,_] of this.userOnMessageMap) {
                this._mqttSubscribe(username);
            }
          })
        this.client.on("error", (err) => {
            this.clientConnected = false;
            console.log("mqtt_error", appConfig.mqttUrl, err);
        });
        this.client.on("disconnect", () => {
            this.clientConnected = false;
            console.log("mqtt_disconnect", appConfig.mqttUrl);
        });
    }
    _mqttSubscribe(username:string) {
        this.client.subscribe(this.getUserTopic(username), (err) => {
            if (!err) {
                console.log("mqtt_subscribe ok", this.getUserTopic(username), err);
                this.publishJson(this.getUserTopic(username), { message: "Hello from mqtt" });
            } else {
                console.log("mqtt_subscribe err", this.getUserTopic(username), err);
            }
        });
    }
    addUser(username:string, messageCalback:(message:string)=>void) {
        console.log("addUser", username);
        this.userOnMessageMap.set(username, messageCalback);
        if(this.clientConnected) {
            this._mqttSubscribe(username);
        }
    }
    removeUser(username:string) {
        console.log("removeUser", username);
        this.userOnMessageMap.delete(username);
        if(this.clientConnected) {
            this.client.unsubscribe(this.getUserTopic(username));
        }
    }
    publishJson(topic:string, message:any) {
        if(appConfig.logMqtt) {
            if(!appConfig.logIce&&(message.type=="callIce"||message.forType=="callIce"||message.type=="callVideoIce"||message.forType=="callVideoIce")) {
                //do not log ice
            } else {
                console.log("mqtt_out_", topic, message);
            }
        }
        this.client.publish(topic, JSON.stringify(message));
    }
    getUserTopic(username:string) {
        return "user/" + username;
    }
}


export const mqttClient = new MqttClient();