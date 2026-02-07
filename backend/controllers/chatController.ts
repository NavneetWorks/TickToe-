import { Request, Response } from "express";
import {pool} from '../src/utils/db';
import jwt from "jsonwebtoken";
import { onlineCounts,userFriends } from "../src/sockets/real_time.store";
import { getIO } from "../src/sockets/socketInstance";


const friendList =async(req:Request,res:Response)=>{
    try{
        console.log("inside freind list controller");
        const token = req.cookies.token;
        if(!token){
            return res.status(400).json({message:"token missing"});
        }
        const jwt_secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token,jwt_secret) as jwt.JwtPayload & {userId:string};
        const userId = decoded.userId;

        const friends = await pool.query(
            `SELECT u.id, u.nickname
            FROM friends f
            JOIN users u 
            ON u.id = CASE
                    WHEN f.user_id = $1 THEN f.friend_id
                    ELSE f.user_id
                    END
            WHERE (f.user_id = $1 OR f.friend_id = $1)
            AND f.status = 'accepted' `,
            [userId]
        );
     
         return res.status(200).json(friends.rows);
        
    }catch(err){
        console.log("error in freindlist controller err : ",err);
        return res.status(400).json({message:"server error"});
    }
}
const searchUsers = async(req:Request,res:Response)=>{
    try{
        console.log("inside search users");
        const term = req.params.term  as string;
        if (!term?.trim()) {
            return res.status(400).json({ message: "Search term required" });
        }
        const token = req.cookies.token;
        if (!token) {
             return res.status(401).json({ message: "Unauthorized" });
        }
        let userId;
        try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { userId: string };
            userId = decoded.userId;
        } catch {
            return res.status(401).json({ message: "Invalid token" });
        }
        const users = await pool.query(
            `select u.id,u.nickname
             from users u
             where u.nickname ilike $1 and u.id != $2
             and u.id not in(
                select
                  case
                    when f.user_id = $2 then f.friend_id
                    else f.user_id
                  end
                from friends f
                where(f.user_id = $2 or f.friend_id = $2 and f.status = 'accepted')
             )
             order by length(u.nickname),u.nickname
             limit 10;
            `,
            [`${term}%`,userId]
        );
        //console.log(users);
        return res.status(200).json(users.rows);
    }catch(err){
        console.log(err);
        return res.status(500).json({message:"server error"});
    }
}

const sendFriendRequest = async(req:Request,res:Response)=>{
    const io = getIO();
    try{
        console.log("inside request");
        const {targetUserId} = req.body;
        if(!targetUserId){
            return res.status(400).json({message:"target user required"});
        }
        const token = req.cookies.token;
        if (!token) {
             return res.status(401).json({ message: "Unauthorized" });
        }
        let userId;
        try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { userId: string };
            userId = decoded.userId;
        } catch {
            return res.status(401).json({ message: "Invalid token" });
        }
        if(userId === targetUserId){
            return res.status(400).json({message:"cannot send request to yourself"});
        }
        const targetUser = await pool.query(
            `select id from users where id = $1`,
            [targetUserId]
        );
        if(targetUser.rows.length === 0){
            return res.status(404).json({message:"user not found"});
        }
        const existing = await pool.query(
            `select * from friends
            where
              (user_id = $1 and friend_id = $2)
              or
              (user_id = $2 and friend_id = $1)
            `,
            [userId,targetUserId]
        );
        if(existing.rows.length > 0){
            const relation = existing.rows[0];
            if(relation.status === "accepted"){
                return res.status(400).json({message:"already friends"});
            }
            if(relation.status === "pending"){
                if(relation.user_id == targetUserId){
                    await pool.query(
                        `update friends
                        set status = 'accepted'
                        where user_id = $1 and friend_id = $2`,
                        [targetUserId,userId]
                    );
                   if(userFriends.has(targetUserId)){
                        userFriends.get(targetUserId)?.add(userId);
                    } 
                    if(userFriends.has(userId)){
                        userFriends.get(userId)?.add(targetUserId);
                    }
                    if (onlineCounts.has(userId)) {
                        let sender;
                        let senderNickname;
                        try{
                            sender = await pool.query(
                                `select nickname from users
                                where id = $1`,
                                [targetUserId]
                            );
                            if (!sender.rows.length) return;
                            senderNickname = sender.rows[0].nickname;
                        }
                        catch(err){
                            console.log("unable to get nickname err : ",err);
                        }
                    io.to(userId).emit("friend_added", {
                        id:targetUserId,
                        nickname:senderNickname
                    });
                    }

                    if (onlineCounts.has(targetUserId)) {
                        let sender;
                        let senderNickname;
                        try{
                            sender = await pool.query(
                                `select nickname from users
                                where id = $1`,
                                [userId]
                            );
                            if (!sender.rows.length) return;
                            senderNickname = sender.rows[0].nickname;
                        }
                        catch(err){
                            console.log("unable to get nickname err : ",err);
                        }
                    io.to(targetUserId).emit("friend_added", {
                        id:userId,
                        nickname:senderNickname
                    });
                    }
                    return res.status(200).json({message:"friend request accpeted"});
                }
            }
            return res.status(400).json({message:"request already sent"});
            
        }
        await pool.query(
            `insert into friends(user_id,friend_id,status)
             values($1,$2,$3)
            `,
            [userId,targetUserId,"pending"]
        );
        console.log("here after inserting query");
        if (onlineCounts.has(targetUserId)) {
            let sender;
            let senderNickname;
            try{
                sender = await pool.query(
                    `select nickname from users
                    where id = $1`,
                    [userId]
                );
                if (!sender.rows.length) {
                    console.log("nickname not found ");
                    return res.status(500).json({ message: "User nickname not found" });
                }
                senderNickname = sender.rows[0].nickname;
            }
            catch(err){
                console.log("unable to get nickname err : ",err);
            }
            console.log("nickname : ",senderNickname);
            io.to(targetUserId).emit("recieve_request", {
                id:userId,
                nickname:senderNickname
                });
            }
        return res.status(200).json({message:"request sent"});
    }catch(err){
        console.log('error in send freind requst controller')
        return res.status(500).json({message:"server error"});
    }
}
const getPendingRequests = async(req:Request,res:Response)=>{
     try{
        console.log("inside getpendingrequest controller");
        const token = req.cookies.token;
        if(!token){
            return res.status(401).json({message:"token missing"});
        }
        const jwt_secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token,jwt_secret) as jwt.JwtPayload & {userId:string};
        const userId = decoded.userId;

        const friends = await pool.query(
            `SELECT u.id, u.nickname
            FROM friends f
            JOIN users u on u.id = f.user_id
            where f.friend_id = $1
            AND f.status = 'pending' `,
            [userId]
        );
     
         return res.status(200).json(friends.rows);
        
    }catch(err){
        console.log("error in get pending request controller err : ",err);
        return res.status(500).json({message:"server error"});
    }
}
const rejectFriendRequest = async(req:Request,res:Response)=>{
    try{
        console.log("inside reject request controller ");
        const requestId = req.params.requestId as string;
        if(!requestId?.trim()){
            return res.status(401).json({message:"request id required"});
        }
        const token = req.cookies.token;
        if(!token){
             return res.status(401).json({message:"token is missing"});
        }
        const jwt_secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token,jwt_secret) as jwt.JwtPayload & {userId:string};
        const userId = decoded.userId;
        const result = await pool.query(
            `delete from friends
            where user_id = $1
            and friend_id = $2
            and status = 'pending'`,
            [requestId,userId]
        );
        if(result.rowCount === 0){
            return res.status(400).json({message:"request not found"});
        }
        return res.status(200).json({ message: "Request rejected" });
    }catch(err){
        console.log("error in rejectfreind controller err:",err);
        return res.status(500).json({message:"server error"});
    }
}
const acceptFriendRequest = async(req:Request,res:Response)=>{
    const io = getIO();
    try{
        console.log("inside accept request controller ");
        const requestId = req.params.requestId as string;
        if(!requestId?.trim()){
            return res.status(401).json({message:"request id required"});
        }
        const token = req.cookies.token;
        if(!token){
             return res.status(401).json({message:"token is missing"});
        }
        const jwt_secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token,jwt_secret) as jwt.JwtPayload & {userId:string};
        const userId = decoded.userId;
        const result = await pool.query(
            `update friends
            set status = 'accepted'
            where user_id = $1
            and friend_id = $2
            and status = 'pending'`,
            [requestId,userId]
        );
        if(result.rowCount === 0){
            return res.status(400).json({message:"request not found"});
        }
        if (userFriends.has(userId)) {
            userFriends.get(userId)?.add(requestId);
        }

        if (userFriends.has(requestId)) {
            userFriends.get(requestId)?.add(userId);
        }
        if (onlineCounts.has(userId)) {
            let sender;
            let senderNickname;
            try{
                sender = await pool.query(
                    `select nickname from users
                    where id = $1`,
                    [requestId]
                );
                if (!sender.rows.length) return;
                senderNickname = sender.rows[0].nickname;
            }
            catch(err){
                console.log("unable to get nickname err : ",err);
            }
            io.to(userId).emit("friend_added", {
            id: requestId,
            nickname:senderNickname
        });
        }

        if (onlineCounts.has(requestId)) {
             let sender;
            let senderNickname;
            try{
                sender = await pool.query(
                    `select nickname from users
                    where id = $1`,
                    [userId]
                );
                if (!sender.rows.length) return;
                senderNickname = sender.rows[0].nickname;
            }
            catch(err){
                console.log("unable to get nickname err : ",err);
            }
            io.to(requestId).emit("friend_added", {
                id:userId,
                nickname:senderNickname
            });
        }
        return res.status(200).json({ message: "Request accepted" });
    }catch(err){
        console.log("error in accept friend controller err:",err);
        return res.status(500).json({message:"server error"});
    }
}
export{friendList,searchUsers,sendFriendRequest,getPendingRequests,acceptFriendRequest,rejectFriendRequest};