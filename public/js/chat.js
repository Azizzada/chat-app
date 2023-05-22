const socket = io();

// Elements
const $messageForm = document.getElementById("message-form");
const $sendLocationButton = document.getElementById("send-location");
const $messageSubmitButton = document.getElementById("message-button");
const $messageFormInput = document.getElementById("message");
const $messages = document.getElementById("messages");
const sidebar = document.getElementById("sidebar");

// Templates
const messageTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById("location-template").innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

// options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // new message element
  const $newMessage = $messages.lastElementChild;

  // Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible Height
  const visibleHeight = $messages.offsetHeight;

  // Height if messages container
  const containerHeight = $messages.scrollHeight;

  // how far have i scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (url) => {
  console.log(url);
  const html = Mustache.render(locationTemplate, {
    username: url.username,
    location: url.url,
    createdAt: moment(url.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room: room,
    users: users,
  });
  sidebar.innerHTML = html;
});

$messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // disableing the button
  $messageSubmitButton.setAttribute("disabled", "disabled");

  const message = event.target.elements.message.value;
  // we can also set a callback request to let us know when the message has been received by server
  socket.emit("sendMessage", message, (deliveryNotification) => {
    // enablading button
    $messageSubmitButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    console.log(deliveryNotification);
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  } else {
    $sendLocationButton.setAttribute("disabled", "disabled");
    navigator.geolocation.getCurrentPosition((position) => {
      const location = {
        lat: position.coords.latitude,
        long: position.coords.longitude,
      };
      socket.emit("sendLocation", location, (acknowledgment) => {
        $sendLocationButton.removeAttribute("disabled");
        console.log(acknowledgment);
      });
    });
  }
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});

// socket.emit ===>>>>> that send an event to a spicific client that matches that creteria set.
// io.emit ===>>>>> that send an event to every client
// socket.broadcast.emit ===>>>>> that send an event to every client expect for socket.

// io.to.emit ===>>>>> that emit an event to everyone in a spicific chatroom without sending it to other room
// socket.broadcast.to.emit ===>>>>> that sends event to everyone in a spicific chatroom But not sending it to socket.
