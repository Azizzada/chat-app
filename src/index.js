const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const badwords = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
// socketio expects a raw http server so therefore we connect express and sockio using http librarie.
const httpServer = http.createServer(app);
const io = socketio(httpServer);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

//  this sets a connectio and we use io.on which is only for connecting. lets us know when they are connecting
io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }
    socket.join(user.room);

    // this send message to everyone lestening to message event. BUT doesnt update everytime some sends message to server.
    // we used a function that will will accept 'welcome' as message and also produce a timestamp
    socket.emit("message", generateMessage("Admin", "Welcome!"));
    // this send message to everyone EXCEPT the person who just joined or refreshed his page.
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  // lestening to sendMessage event
  socket.on("sendMessage", (message, deliveryNotification) => {
    const user = getUser(socket.id);
    // this is a library that checks for bad words
    const filter = new badwords();
    if (filter.isProfane(message)) {
      return deliveryNotification("Message container unapprioperiate words!");
    }
    // sends/bradcasts message to everybody
    io.to(user.room).emit("message", generateMessage(user.username, message));
    // setting this callback to get a response when we receive something. we set this in Chat.js
    deliveryNotification("Message received!");
  });

  // acknowledgment is a callback same as deliveryNotification above.
  socket.on("sendLocation", (location, acknowledgment) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps/@${location.lat},${location.long}`
      )
    );
    acknowledgment("Location shared!");
  });

  // this code only runs when client is disconnect
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

httpServer.listen(port, () => {
  console.log("Server is up on port " + port);
});
