#FROM registry.ng.bluemix.net/ibmliberty
FROM websphere-liberty:javaee7
COPY target/library-server-java.war /opt/ibm/wlp/usr/servers/defaultServer/dropins/
EXPOSE 9080

CMD ["/opt/ibm/wlp/bin/server", "run", "defaultServer"]
