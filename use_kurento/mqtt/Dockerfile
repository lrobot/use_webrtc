FROM bytebeamio/rumqttd
COPY _keys /etc/tls
COPY rumqttd.toml /etc/rumqttd.toml
RUN ls /etc/tls
ENTRYPOINT ["rumqttd", "-c", "/etc/rumqttd.toml"]




