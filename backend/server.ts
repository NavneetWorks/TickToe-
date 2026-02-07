
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { registerSockets } from "./src/sockets";
import { setIO } from "./src/sockets/socketInstance"; 
import authRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import {pool} from './src/utils/db';
import cookieParser from 'cookie-parser';


dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET","POST"],credentials:true }
});

app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}));
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth",authRoutes);
app.use("/api/chat",chatRoutes);

registerSockets(io);
setIO(io);
const PORT = process.env.PORT;
server.listen(PORT, () => {
  pool.query("SELECT NOW()")
    .then(res => {
      console.log("db connected:",res.rows[0]);
    })
    .catch(err => {
      console.error("Db error : ",err);
    });
  console.log("Server running on port : ",PORT);
});