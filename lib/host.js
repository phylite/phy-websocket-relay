const ReconnectingWebSocket = require("@phylite/phy-reconnecting-websocket");
const EventEmitter = require('@phylite/phy-event-emitter');

class WebSocketRelayHost extends EventEmitter {
    constructor(relayServerURL, client_id) {
        super();
        this.relayServerURL = relayServerURL;
        this.ws = new ReconnectingWebSocket(this.relayServerURL, {rejectUnauthorized: false}); // allow self signed certificate
        this.clients = {}; // active guests

        let connect = () => {
            // sign up as a Host
            this.ws.send(JSON.stringify({command: "SERVE", client_id: client_id}));
            this.emit("ready");
        };

        this.ws.on("open", connect);

        this.ws.on("reconnect", connect);

        this.ws.on("close", (...e) => {
            this.emit("close", ...e); // emit close event
            this.clients = {}; // remove clients
        });

        this.ws.on("message", messageData => {
            let {command, data, client_id} = JSON.parse(messageData.data);

            // new Guest has connected
            if (command === "CONNECT") {
                let client = this.clients[client_id] = new Client(this.ws, client_id);
                this.emit("connection", client);
            }

            // Guest has disconnected
            if(command === "DISCONNECT"){
                this.clients[client_id].emit("close");
            }

            // Guest has send a message
            if(command === "MESSAGE") {
                this.clients[client_id].emit("message", data);
            }

        });

        this.ws.on("error", (...e) => {
            this.emit("error", ...e);
        });

    }
}

class Client extends EventEmitter{

    constructor(ws, id){
        super();
        this.id = id;
        this.ws = ws;
    }

    send(data){
        return this.ws.send(JSON.stringify({command: "MESSAGE", data: data, client_id: this.id}));
    }

}

module.exports = WebSocketRelayHost;