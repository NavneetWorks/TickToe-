
import { getSocket } from "./socket";
import { useEffect, useRef } from "react";
import Auth from './Pages/Auth';
import GameUI from "./Pages/GameUi";
import Nickname from "./Pages/Nickname";
import Home from "./Pages/Home";
import SearchBar from "./Pages/Search";
import {Routes,Route, BrowserRouter} from "react-router-dom";

function AppContent() {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return; 
    connectedRef.current = true;

    let playerId = localStorage.getItem("playerId");
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem("playerId", playerId);
    }

    const socket = getSocket();
    socket.connect();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("register_player", { playerId });
      socket.emit("online_user");
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    // <div className="min-h-screen bg-green-500 flex items-center justify-center">
    <div>
      <main>
        <Routes>
          <Route path = '/' element = {<Home/>}/>
          <Route path = '/login' element = {<Auth/>}/>
          <Route path = '/game' element = {<GameUI />}/>
          <Route path = '/set-nickname' element = {<Nickname/>}/>
          <Route path = '/search' element = {<SearchBar/>}/>
          
        </Routes>
      </main>
      
    </div>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AppContent/>
    </BrowserRouter>
  )
};