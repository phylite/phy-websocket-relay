const EventEmitter = require('@phylite/phy-event-emitter');
const WebSocket = require("ws");

class WebSocketRelayGuest extends EventEmitter {

    constructor(relayServerURL, client_id, options){
        super();
        this.ws = new WebSocket(relayServerURL, {rejectUnauthorized: false});

        let ws = this.ws;

        this.connetcionTimeout = setTimeout(() => {
            this.emit("error",  new Error("Could not connect to server"));
        }, 2000);

        ws.addEventListener("open", () => {
            ws.send(JSON.stringify({command: "CONNECT", client_id: client_id})); // connect to host
        });

        ws.addEventListener("close", () => {
            this.emit("close");
        });

        ws.addEventListener("message", (message) => {
            let {command, data, client_id} = JSON.parse(message.data);

            if(command === "MESSAGE") this.emit("message", data);

            if(command === "DISCONNECT") this.ws.close();

            if(command === "CONNECT") {
                clearTimeout(this.connetcionTimeout);
                this.emit("open");
            }
        });
    }

    send(data){
        this.ws.send(JSON.stringify({command: "MESSAGE", data: data}));
    }

}

module.exports = WebSocketRelayGuest;