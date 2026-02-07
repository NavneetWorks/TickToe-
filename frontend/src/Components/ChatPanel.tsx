import { useEffect, useState } from "react";
import { getSocket } from "../socket";

interface Friend {
  id: string;
  nickname: string;
  isOnline: boolean;
}

interface Message {
  fromUserId: string;
  content: string;
  createdAt?: string;
}

export default function ChatPanel() {
  console.log("inside chat panel");
  const socket = getSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");


  useEffect(() => {
    console.log("load friends");
    fetch("http://localhost:3000/api/chat/friends", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setFriends(data));
  },[]);

  useEffect(() => {
    console.log("inside event receive message");

    socket.on("receive_message", (data: Message) => {
      console.log("recieved message : ",data);
      setMessages(prev => [...prev, data]);
    });

    socket.on("friend_added",(data) =>{
      setFriends(prev => {
        if(prev.some(f => f.id === data.id)){
          return prev;
        }
        return [data,...prev];
      });
    });


    return () => {
      socket.off("receive_message");
      socket.off("friend_added");
    };
    
  }, [socket]);

  const openChat = async (friend: Friend) => {
    setSelectedFriend(friend);
    socket.emit("join_chat",()=>{
        console.log("emitting join_chat signal");

    })
    const res = await fetch(
      `http://localhost:3000/api/chat/messages/${friend.id}`,
      { credentials: "include" }
    );

    const data = await res.json();
    setMessages(data);
  };

  const sendMessage = () => {
    console.log("inside event send message : ",input);
    if (!input.trim() || !selectedFriend) return;

    socket.emit("private_message", {
      toUserId: selectedFriend.id,
      content: input,
    });

    setMessages(prev => [
      ...prev,
      { fromUserId: "me", content: input },
    ]);

    setInput("");
  };

  return (
    <>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full shadow-lg z-50"
      >
        Chat
      </button>

      {/* 📦 Sliding Sidebar */}
      <div
        className={`
          fixed top-0 right-0 h-screen w-[350px]
          bg-gray-900 text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col p-4 shadow-2xl z-40
        `}
      >
        {/* 🔹 Friend List */}
        {!selectedFriend && (
          <>
            <h3 className="text-lg font-semibold mb-4">Friends</h3>

            <div className="space-y-2 overflow-y-auto">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  onClick={() => openChat(friend)}
                  className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer rounded-lg transition"
                >
                  <span>{friend.nickname}</span>

                  <span
                    className={`w-3 h-3 rounded-full ${
                      friend.isOnline
                        ? "bg-green-400 animate-pulse"
                        : "bg-gray-500"
                    }`}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* 🔹 Chat Window */}
        {selectedFriend && (
          <>
            <button
              onClick={() => setSelectedFriend(null)}
              className="text-sm text-blue-400 hover:text-blue-300 mb-3"
            >
              ← Back
            </button>

            <h4 className="font-semibold mb-3">
              {selectedFriend.nickname}
            </h4>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm break-words ${
                    msg.fromUserId === "me"
                      ? "bg-blue-600 ml-auto"
                      : "bg-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}