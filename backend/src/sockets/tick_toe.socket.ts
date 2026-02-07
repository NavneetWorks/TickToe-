import { Server, Socket } from "socket.io";

interface Game {
  playerId1: string;
  playerId2: string;
  board: (string | null)[];
  currentTurn: "X" | "O";
  result: "X" | "O" | "draw" | null;
}

let waitingPlayer: string | null = null;
let games: Game[] = [];

const playerSockets = new Map<string, string>();
const socketPlayers = new Map<string, string>();

const winPatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWin(board: (string | null)[], symbol: string): boolean {
  return winPatterns.some(p => p.every(i => board[i] === symbol));
}

function checkDraw(board: (string | null)[]): boolean {
  return board.every(c => c !== null);
}

export function registerTicToeSocket(io: Server) {
  io.on("connection", (socket: Socket) => {

    socket.on("register_player", ({ playerId }) => {
      console.log("INSIDE game REGISTER_PLAYER");
      playerSockets.set(playerId, socket.id);
      socketPlayers.set(socket.id, playerId);

      const game = games.find(
        g => g.playerId1 === playerId || g.playerId2 === playerId
      );

      if (game && game.result === null) {
        io.to(socket.id).emit("sync_game", {
          board: game.board,
          currentTurn: game.currentTurn,
          symbol: game.playerId1 === playerId ? "X" : "O",
          result: game.result
        });
        return;
      }

      if (waitingPlayer === null) {
        waitingPlayer = playerId;
        return;
      }

      games = games.filter(
        g =>
          g.playerId1 !== waitingPlayer &&
          g.playerId2 !== waitingPlayer &&
          g.playerId1 !== playerId &&
          g.playerId2 !== playerId
      );

      const newGame: Game = {
        playerId1: waitingPlayer,
        playerId2: playerId,
        board: Array(9).fill(null),
        currentTurn: "X",
        result: null
      };

      games.push(newGame);

      const s1 = playerSockets.get(waitingPlayer);
      const s2 = playerSockets.get(playerId);

      if (s1 && s2) {
        io.to(s1).emit("game_start", {
          symbol: "X",
          board: newGame.board,
          currentTurn: "X"
        });
        io.to(s2).emit("game_start", {
          symbol: "O",
          board: newGame.board,
          currentTurn: "X"
        });
      }

      waitingPlayer = null;
    });

    socket.on("my_move", (idx: number) => {
      const playerId = socketPlayers.get(socket.id);
      if (!playerId) return;

      const game = games.find(
        g => g.playerId1 === playerId || g.playerId2 === playerId
      );
      if (!game) return;

      const symbol = game.playerId1 === playerId ? "X" : "O";
      if (game.currentTurn !== symbol) return;
      if (game.board[idx] !== null) return;

      game.board[idx] = symbol;

      const s1 = playerSockets.get(game.playerId1);
      const s2 = playerSockets.get(game.playerId2);
      if (!s1 || !s2) return;

      if (checkWin(game.board, symbol)) {
        game.result = symbol;
        io.to(s1).emit("game_over", { board: game.board, result: game.result });
        io.to(s2).emit("game_over", { board: game.board, result: game.result });
        return;
      }

      if (checkDraw(game.board)) {
        game.result = "draw";
        io.to(s1).emit("game_over", { board: game.board, result: "draw" });
        io.to(s2).emit("game_over", { board: game.board, result: "draw" });
        return;
      }

      game.currentTurn = game.currentTurn === "X" ? "O" : "X";

      io.to(s1).emit("new_board", {
        board: game.board,
        currentTurn: game.currentTurn
      });
      io.to(s2).emit("new_board", {
        board: game.board,
        currentTurn: game.currentTurn
      });
    });
  });
}