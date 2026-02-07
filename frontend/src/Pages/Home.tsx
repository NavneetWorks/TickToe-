import ChatPanel from "../Components/ChatPanel";
import RequestPanel from "../Components/RequestList";

export default function Home(){
    return (
        <div>
            <h1>HOME</h1>
            <RequestPanel/>
            <ChatPanel/>
        </div>
    )
}