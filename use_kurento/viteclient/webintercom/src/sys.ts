

import { MqttClient } from './mqtt';
import { makeid } from './util';

class AppSys {
    user_id : string;
    mqttClient : MqttClient;
    constructor(user_id:string) {
        this.user_id = user_id;
        this.mqttClient = new MqttClient(this.user_id);
    }
}

export const appSys = new AppSys(makeid(10));
export const mqttClient = appSys.mqttClient;
