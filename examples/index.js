const { WebSocketRelayServer, WebSocketRelayHost, WebSocketRelayGuest } = require("../index.js");


let ip = "ws://127.0.0.1";
let identifier = "example_server_id";

let server = new WebSocketRelayServer({port: 8080});

server.on("ready", () => {
    let host = new WebSocketRelayHost(ip, identifier);

    // host received message
    host.on("connection", (client) => {
        client.on("message", (message) => {
            console.log(`Guest has sent: ${message}`);
        });
    });

    //guest sends message
    host.on("ready", () => {
        let guest = new WebSocketRelayGuest(ip, identifier);
        guest.on("open", () => {
            guest.send("this is a test message");
        });
    });

});

server.on("host", host => {
    console.log("Host connected, id: " + host.id);
});

server.on("guest", guest => {
    console.log("Guest connected, id: " + guest.id);
});
