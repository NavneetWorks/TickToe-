import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
declare global {
  interface Window {
    google: any;
  }
}

export default function Auth() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleGoogleLoad = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "208336423387-n08lmqrtciurmp1btb96hqchhsvsaeqo.apps.googleusercontent.com",
          callback: async(response: any) => {
            console.log("Google Credential:", response);

            const res = await fetch("http://localhost:3000/api/auth/google",{
              method:"POST",
              headers:{
                "Content-Type":"application/json",
              },
              credentials:"include",
              body:JSON.stringify({
                credential : response.credential,
              }),
            });
            if(res.ok){
              const data = await res.json();
              if(data.nickNeed){
                navigate('/set-nickname')
              }
              else{
                navigate('/');
              }
           }
          },
        });

        window.google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large" }
        );
      }
    };

    setTimeout(handleGoogleLoad, 500);
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "200px" }}>
      <div id="googleBtn"></div>
    </div>
  );
}