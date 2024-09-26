
import mqtt from 'mqtt';
import { EventEmitter } from 'stream';



class QMqttClient {
  url:string
  mqtt: mqtt.MqttClient
  _eventEmit: EventEmitter;

  constructor(url:string) {
    this._eventEmit = new EventEmitter();
    this.url = url;
    this.mqtt = mqtt.connect(url);
    this.mqtt.on("connect", () => {
      console.log("mqtt connected");
    });
    this.mqtt.on("message", (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
      // console.log("mqtt message:", topic, payload.toString());
      this._eventEmit.emit(topic, payload.toString());
    })
  }

  public on(topic:string, listener:(...args:any[])=>void) {
    this._eventEmit.on(topic, listener);
  }
  public publish(topic:string, message:string) {
    this.mqtt.publish(topic, message);
  }
  async publishAsync(topic:string, message:string) {
    return this.mqtt.publishAsync(topic, message);
  }
  public subscribe(topic:string) {
    this.mqtt.subscribe(topic, (err:any) => {
      if (err) {
        console.log("error subscribing to topic", topic, err);
      }
    });
  }
  async subscribeAsync(topic:string) {
    return this.mqtt.subscribeAsync(topic);
  }
  public testWithLog() {
    this.mqtt.subscribe("presence", (err:any) => {
      if (!err) {
        this.mqtt.publish("presence", "Hello mqtt");
        this.mqtt.publish("presence", "Hello mqtt");
      }
    });

    this.mqtt.subscribe("test", (err:any) => {
      if (!err) {
        this.mqtt.publish("test", "Hello test");
      }
    });
    this.mqtt.on("message", (topic:string, message:Buffer,packet: mqtt.IPublishPacket) => {
      // message is Buffer
      console.log(topic + ':' + message.toString());
    });
  }
}

export default QMqttClient;
