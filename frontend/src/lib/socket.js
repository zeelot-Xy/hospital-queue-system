import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      autoConnect: true,
      auth: { token },
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
