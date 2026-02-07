
import {Router} from 'express';
import {pool} from '../src/utils/db';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import {OAuth2Client} from 'google-auth-library';


const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);
const register = async(req:Request,res:Response)=>{
    try{
        console.log("inside register",process.env.JWT_SECRET);
        const {username,email,password} = req.body;

        if(!username || !email || !password){
            return res.status(400).json({message:"All fields required"});
        }
        const existingUser = await pool.query(
            "Select * from users where email = $1",
            [email]
        );
        if(existingUser.rows.length>0){
            return res.status(400).json({message : "user already exists"});
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const user = await pool.query(
            `insert into users(id,username,email,password,provider)
             values(gen_random_uuid(),$1,$2,$3,$4)
             returning id`,
             [username,email,hashedPassword,"local"]
        );
        const userId = user.rows[0].id;
        const token = jwt.sign(
            {userId : userId},
            process.env.JWT_SECRET as string,
            {expiresIn:"7d"}
        );
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite:"lax",
        });

        res.status(201).json({message: "User registered successfully"});
    }catch(err){
        console.error(err);
        res.status(500).json({message:"Server error"});
    }
}
const googleLogin = async(req:Request,res:Response)=>{
    try{
        console.log("inside google login");
        const {credential} = req.body;
        if(!credential){
            return res.status(400).json({message:"No credential provided"});
        }
        console.log("Google credential recieved : ",credential);
        const ticket = await client.verifyIdToken({
            idToken:credential,
            audience:process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if(!payload || !payload.email){
            return res.status(401).json({message:"Invalid Google token"});
        }
        let user = await pool.query(
            `select id,nickname from users where email = $1`,
            [payload.email]
        );
        let userId;
        
        if(user.rows.length === 0){
                 user = await pool.query(
                `insert into users(id,username,email,password,provider,provider_id)
                 values(gen_random_uuid(),$1,$2,$3,$4,$5)
                 returning id,nickname`,
                [payload.name,payload.email,null,'google',payload.sub]
            );
        }
        userId = user.rows[0].id;
        
        const token = jwt.sign(
            {userId:userId},
            process.env.JWT_SECRET as string,
            {expiresIn : "7d"}
        );
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite:"lax"
        });

        const nickNeed = !user.rows[0].nickname;
        return res.status(200).json({nickNeed});
    

    }catch(err){
        console.error(err);
        res.status(500).json({message : "Server error"});
    }
};

const setNickname = async(req:Request,res:Response)=>{
    try{
        console.log("Inside set Nickname");
        const {nickname} = req.body;
        if (!nickname) {
          return res.status(400).json({ message: "Nickname required" });
        }
        const already = await pool.query(
            `select * from users where nickname = $1`,
            [nickname]
        );
        if(already.rows.length>0){
            console.log("user exist with this nickname");
            return res.status(400).json("user exists with this nick name");
        }
        const token = req.cookies.token;
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as {userId:string};
        const userId = decoded.userId;
        await pool.query(   
            `update users set nickname = $1 where id = $2`,
            [nickname,userId]
        )
        res.status(200).json({message:"nick name set"});
    }
    catch(err){
        console.error(err);
        return res.status(400).json({message:"Server error"});
    }
}

export { register ,googleLogin,setNickname};