import {Server} from 'socket.io';
let io:Server;
export const setIO = (server:Server)=>{
    io = server;
};
export const getIO = () =>{
    return io;
};