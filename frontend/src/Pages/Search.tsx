import { useState, useEffect } from "react";
import RequestPanel from "../Components/RequestList";

interface SearchUser {
  id: string;
  nickname: string;
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUser[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResult([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/api/chat/search/${searchTerm}`,
          { credentials: "include" }
        );

        if (!res.ok) return;

        const data = await res.json();
        setSearchResult(data);
      } catch (err) {
        console.log("search error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const sendRequest = async (targetUserId: string) => {
    try {
      const res = await fetch(
        "http://localhost:3000/api/chat/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ targetUserId }),
        }
      );

      if (!res.ok) return;

      setSearchResult(prev =>
        prev.filter(user => user.id !== targetUserId)
      );
    } catch (err) {
      console.log("request failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white relative">

      {/* Requests Button */}
      <button
        onClick={() => setShowRequests(true)}
        className="
          fixed top-6 right-8
          px-4 py-2
          text-sm
          bg-[#1a1d24]
          border border-[#2c313c]
          rounded-md
          hover:border-blue-500
          transition
          z-40
        "
      >
        Requests
      </button>

      {/* Top Search Section */}
      <div className="w-full flex justify-center pt-12">

        <div className="w-[60%] min-w-[500px]">

          <h2 className="text-xs tracking-widest text-gray-500 uppercase mb-3">
            Player Search
          </h2>

          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full
              h-14
              px-5
              text-sm
              bg-[#1a1d24]
              border border-[#2c313c]
              rounded-md
              focus:outline-none
              focus:border-blue-500
              transition
            "
          />

        </div>
      </div>

      {/* Search Results */}
      <div className="w-full flex justify-center mt-8">
        <div className="w-[60%] min-w-[500px] space-y-2">

          {searchResult.map((user) => (
            <div
              key={user.id}
              className="
                flex justify-between items-center
                h-12
                px-4
                bg-[#1a1d24]
                border border-[#2c313c]
                rounded-md
                hover:bg-[#1f232b]
                hover:border-blue-500
                transition
              "
            >
              <span className="text-sm font-medium">
                {user.nickname}
              </span>

              <button
                onClick={() => sendRequest(user.id)}
                className="
                  text-gray-400
                  hover:text-blue-400
                  transition
                  text-lg
                "
                title="Send Friend Request"
              >
                ➤
              </button>
            </div>
          ))}

          {searchTerm && searchResult.length === 0 && (
            <p className="text-center text-gray-500 text-sm mt-6">
              No players found
            </p>
          )}

        </div>
      </div>

      {/* Overlay */}
      {showRequests && (
        <div
          onClick={() => setShowRequests(false)}
          className="fixed inset-0 bg-black/60 z-40"
        />
      )}

      {/* Sliding Request Panel */}
      <div
        className={`
          fixed top-0 right-0 h-screen w-[380px]
          bg-[#14171d]
          border-l border-[#2c313c]
          transform transition-transform duration-300 ease-in-out
          ${showRequests ? "translate-x-0" : "translate-x-full"}
          z-50
        `}
      >
        <div className="flex justify-between items-center p-4 border-b border-[#2c313c]">
          <h3 className="text-sm tracking-wide text-gray-300 uppercase">
            Friend Requests
          </h3>
          <button
            onClick={() => setShowRequests(false)}
            className="text-gray-500 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          <RequestPanel />
        </div>
      </div>

    </div>
  );
}