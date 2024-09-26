
import kurento from 'kurento-client';

// https://github.com/lrobot/use_webrtc/blob/main/use_kurento/mcu/kurento-mcu-webrtc/server.js


class QKurento {
  private client: kurento.ClientInstance|null = null;
  private kUrl:string
  constructor(private url: string) {
    this.kUrl = url;
    console.log('QKurento constructor');
  }
  async getKurento(): Promise<kurento.ClientInstance> {
    if(this.client) {
      return this.client;
    } else {
      this.client = await kurento(this.kUrl, {});
      return this.client;
    }
  }
  async createMediaPipeline(): Promise<kurento.MediaPipeline> {
    const client = await this.getKurento();
    return client.create('MediaPipeline');
  }
  async createComposite(pipeLine: kurento.MediaPipeline): Promise<kurento.Composite> {
    return pipeLine.create('Composite');
  }
  async createWebRtcEndpoint(pipeLine: kurento.MediaPipeline): Promise<kurento.WebRtcEndpoint> {
    return pipeLine.create('WebRtcEndpoint');
  }
}



export default QKurento;