
import { useState,useEffect } from "react";
import {getSocket} from '../socket';


export default function GameUI() {
  const socket = getSocket();

  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [mySymbol,setMySymbol] = useState<'X'|'O'|null>(null);
  const [currentTurn,setCurrentTurn] = useState<'X'|'O'|null>(null);
  const [result,setResult] = useState<'X'|'O'|'draw'|null>(null);

  const handleCellClick = (index: number) => {
     if(result !== null)return;
    if(mySymbol !== currentTurn)return;
    socket.emit('my_move',index);
    console.log("inside cell click");

  };


  useEffect(()=>{
    socket.on('sync_game',(data)=>{
      console.log('Syncing the data...');
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setMySymbol(data.symbol);
      setResult(data.result);
    })
    socket.on('game_start',(data)=>{
      console.log('Game started : ',data);
      setMySymbol(data.symbol);
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
    });
    socket.on('new_board',(data)=>{
      console.log('new board recieved');
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      console.table(data.board);
    });
    socket.on('game_over',(data)=>{
      setBoard(data.board);
      setResult(data.result);
    })
    return ()=>{
      socket.off('game_start');
      socket.off('new_board');
      socket.off('game_over');
      socket.off('sync_game');
    };
  },[]);

  return (
    <div>
      <h1 className="flex justify-center mt-30 text-4xl font-semibold text-white">Tic Toe Game</h1>
      {!result && mySymbol && <h2 className="flex justify-center mt-5 text-3xl text-blue-100">
        {mySymbol === currentTurn ? "Your turn" : "Opponent's turn"}
      </h2>}
      {!result && !mySymbol && <h2 className="flex justify-center mt-5 text-3xl text-blue-100">
        Matchmaking
      </h2>}
      {result && <h2 className="flex justify-center mt-5 text-3xl text-blue-100">
        Game Over
      </h2>}
    <div className="flex justify-center mt-10">
        <div className="inline-grid grid-cols-3 gap-x-2 gap-y-3">
            {board.map((cell,index)=>(
                <div
                    key={index}
                    onClick={()=> handleCellClick(index)}
                    className="
                      text-white
                      w-24 h-24
                      bg-black
                      flex items-center justify-center text-3xl font-bold
                      cursor-pointer
                      hover:bg-gray-900
                      select-none
                    "
                >
                    {cell}
                </div>
            ))}
        </div>

    </div>
     {result && (
        <h2 className="mt-6 flex justify-center text-2xl text-white">
          {result === 'draw' && "Game draw"}
          {result === mySymbol && "You won"}
          {result && result !== mySymbol && result !== 'draw' && "You lost"}
        </h2>
      )}
    </div>
  );
};

