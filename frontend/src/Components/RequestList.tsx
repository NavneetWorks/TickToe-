import { useEffect,useState } from "react";
import { getSocket } from "../socket";


interface PendingRequest{
    id:string;
    nickname:string;
}
export default function RequestPanel(){
    const socket = getSocket();
    const [requests,setRequests] = useState<PendingRequest[]>([]);
    const [loading,setLoading] = useState(false);
    const[error,setError] = useState("");
    

    useEffect(()=>{
        fetchPendingRequests();
    },[]);
    const fetchPendingRequests = async () =>{
        try{
            setLoading(true);
            const res = await fetch(
                "http://localhost:3000/api/chat/friends/pending",
                {credentials:"include"}
            );
            if(!res.ok){
                console.log("pending request didnt fetch got error");
                return;
            }
            const data = await res.json();
            setRequests(data);
        }catch{
            setError("Failed to load requests");
        }finally{
            setLoading(false);
        }
    };
    
    useEffect(()=>{
        const handleNewRequest = (data:PendingRequest) =>{
            console.log("inside recieve request event");
            setRequests(prev =>{
                if(prev.some(req => req.id === data.id)){
                    return prev;
                }
                return [data,...prev];
            });
        }
        socket.on("recieve_request",handleNewRequest);
        return ()=>{
            socket.off("recieve_request",handleNewRequest);
        }
    },[socket])

    const handleAccept = async(requestId:string)=>{
        try{
            const res = await fetch(
                `http://localhost:3000/api/chat/friends/accept/${requestId}`,
                {
                    method:'POST',
                    credentials:"include"
                }
            );
            if(!res.ok){
                console.log("error in accepting reqeust");
                return;
            }
            setRequests(prev => prev.filter(r=> r.id != requestId));
        }catch{
            alert("Failed to accept request")
        }
    }
     const handleReject = async(requestId:string)=>{
        try{
            const res = await fetch(
                `http://localhost:3000/api/chat/friends/reject/${requestId}`,
                {
                    method:'POST',
                    credentials:"include"
                }
            );
            if(!res.ok){
                console.log("error in rejecting reqeust");
                return;
            }
            setRequests(prev => prev.filter(r=> r.id != requestId));
        }catch{
            alert("Failed to reject request")
        }
    }
    return  (
    <div className="max-w-md mx-auto mt-8 p-4 bg-gray-900 text-white rounded-xl shadow-lg">
      <h2 className="text-lg font-semibold mb-4">Pending Requests</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && requests.length === 0 && (
        <p className="text-gray-400">No pending requests</p>
      )}

      <div className="space-y-3">
        {requests.map(request => (
          <div
            key={request.id}
            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
          >
            <span>{request.nickname}</span>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(request.id)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md"
              >
                Accept
              </button>

              <button
                onClick={() => handleReject(request.id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}