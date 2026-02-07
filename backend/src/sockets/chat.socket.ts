import {Server,Socket} from 'socket.io';
import {pool} from "../utils/db";
import jwt from 'jsonwebtoken';
import { onlineCounts, userFriends } from "./real_time.store";

export function registerChatSocket(io:Server){
    io.on("connection",async(socket:Socket) =>{
            console.log("inside online_user");
            const cookieHeader = socket.handshake.headers.cookie;
           
            if(!cookieHeader){
                console.log(
                    "cookieheader not found"
                )
                return socket.disconnect();
            }
             console.log("Handshake cookies:", cookieHeader);
            const token = cookieHeader.split("; ").find(row => row.startsWith("token="))?.split("=")[1];
            if(!token){
                console.log("token not found");
                return socket.disconnect();
            }
            let userId:string = "";
            let count:number = 0;
            try{
                const decoded = jwt.verify(
                    token,process.env.JWT_SECRET as string
                ) as {userId:string};
                userId = decoded.userId;
                socket.data.userId = userId;
                socket.join(userId);
                count = onlineCounts.get(userId) || 0;
                onlineCounts.set(userId,count+1);

                console.log("user online:",userId);

            } catch {
                return socket.disconnect();
            }
           try
            {
                let onlineFriends: string[] = [];
                 if(count === 0){
                    const friends = await pool.query(
                        `select u.id,u.nickname
                        from friends f
                        join users u 
                        on (
                        (f.user_id = $1 and u.id = friend_id)
                        or
                        (f.friend_id = $1 and u.id = f.user_id)
                        ) 
                        where f.status = 'accepted'`,
                        [userId]
                    );
                    const friendSet = new Set<string>();
                    for(let i = 0;i<friends.rows.length;i++){
                        const friendId = String(friends.rows[i].id);
                        friendSet.add(friendId);
                    }
                    userFriends.set(userId,friendSet);
                 }
                 const catchedFriends = userFriends.get(userId);

                 if(catchedFriends){
                    catchedFriends.forEach(friendId => {
                        if(onlineCounts.has(friendId)){
                            onlineFriends.push(friendId);
                            if(count === 0){
                                io.to(friendId).emit("friends_status",{
                                    userId,
                                });
                            }
                        }
                    });
                 }
                 socket.emit("intial_online_friends",onlineFriends);
        }catch(err){
            console.log("error : ",err);
        }

        socket.on("private_message",async({toUserId,content})=>{
            const fromUserId = socket.data.userId;
            if(!fromUserId || !toUserId || !content) return;
            try{
                await pool.query(
                    `insert into messages(sender_id,receiver_id,content)
                    values($1,$2,$3)`,
                    [fromUserId,toUserId,content]
                );
          
                io.to(toUserId).emit("receive_message",{
                    fromUserId,
                    content,
                    createdAt:new Date()
                });    
                
            }
            catch(err){
                console.error("message error:",err);
            }
        });
        
        socket.on("disconnect",()=>{
            const userId = socket.data.userId;
            if(!userId) return;
            const count = onlineCounts.get(userId) || 0;
            if(count <= 1){
                onlineCounts.delete(userId);
                console.log("user full offline",userId);
            }else{
                onlineCounts.set(userId,count-1);
            }
        });
    });
}