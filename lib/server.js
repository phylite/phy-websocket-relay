const uuid = require("uuid");
const WebSocket = require('ws');
const EventEmitter = require("@phylite/phy-event-emitter");

class WebSocketRelayServer extends EventEmitter {

    constructor(options){
        super();
        this.wss = new WebSocket.Server(options);
        this.hosts = {}; // id: Host
        this.ready = false;

        this.wss.on("listening", () => {
            if(!this.ready) this.emit("ready");
            this.ready = true;
        });

        this.wss.on('connection', ws => {
            // Each connection should register as either a host/client or guest/client
            ws.on('message', message => {
                let { command, client_id } = JSON.parse(message);

                //CONNECT a guest to a host
                if(command === "CONNECT" && this.hosts[client_id]){
                    let host = this.hosts[client_id];
                    let guest = new Guest(ws);
                    host.addGuest(guest);
                    this.emit("guest", guest);
                    ws.send(JSON.stringify({command: "CONNECT"}));
                }


                //register as a Host
                if(command === "SERVE") {
                    let host = this.hosts[client_id] = new Host( ws , client_id );
                    this.emit("host", host);
                    ws.on("close", () => {
                        delete this.hosts[host.id];
                    });
                }
            });
        });
        this.wss.on("close", () => {
            this.ready = false;
        });
    }

}

class Guest {

    constructor(ws) {
        this.ws = ws;
        this.id = uuid();
    }
}

class Host {

    constructor(ws, id) {
        this.id = id;
        this.guests = {};
        this.hostWs = ws;

        ws.on("message", messageData => {
            let { command, data, guest_id } = JSON.parse(messageData);
            let guest = this.guests[guest_id];

            // all messages of commandType MESSAGE form the Host get relayed to the guest guest_id.
            if (command === "MESSAGE" && guest){
                guest.ws.send( JSON.stringify({command: "MESSAGE", data, client_id: this.id}) );
            }

        });

        ws.on("close", (...event) => {
            // when connection to the Host socket is lost send a disconnect command to each Guest
            Object.values(this.guests).forEach(guest => {
                if (guest.ws.readyState === WebSocket.OPEN) guest.ws.send(JSON.stringify({
                    command: "DISCONNECT",
                    client_id: guest.id
                }));
            });
        });
    }

    addGuest(guest){
        if(this.guests[guest.id]) return; // if we all ready have the client we dont need it twice.
        this.guests[guest.id] = guest;

        this.hostWs.send(JSON.stringify({command: "CONNECT", client_id: guest.id})); // send the newly connected Guest to the the Host

        // if the guests connection closes inform the host
        guest.ws.on("close", () => {
            this.hostWs.send(JSON.stringify({command: "DISCONNECT", client_id: guest.id}));
            delete this.guests[guest.id];
        });

        // if the guest sends a massage relay it to the host
        guest.ws.on("message", messageData => {
            let { command, data } = JSON.parse(messageData);
            if(command === "MESSAGE") this.hostWs.send(JSON.stringify({command: "MESSAGE", data: data, client_id : guest.id}));
        });
    }
}

module.exports = WebSocketRelayServer;