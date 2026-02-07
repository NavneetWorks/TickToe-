
import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
export default function Nickname(){
        const [nickname,setNickname] = useState("");
        const [error,setError] = useState("");
        const navigate = useNavigate();

        const handleSubmit = async() => {
            if(!nickname.trim()){
                setError("Nickname is required");
                return;
            }
            setError("");
            const res = await fetch("http://localhost:3000/api/auth/set-nickname",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                },
                credentials:"include",
                body:JSON.stringify({nickname})
            });
            const data = await res.json();
            if(!res.ok){
                setError(data.message || data);
                return;
            }
            navigate("/");
        };
    return (
        
        <div>
            <h2>You are welcomed here </h2>
            <input
             type="text"
             value = {nickname}
             placeholder='Enter your nickname'
             onChange={(e) => setNickname(e.target.value)}
              />
             <div style={{ minHeight: "22px", marginTop: "6px" }}>
                <span style={{ color: "red", fontSize: "14px" }}>
                    {error}
                </span>
            </div>
            <button onClick={handleSubmit}>Confirm</button>
        </div>
    )
}