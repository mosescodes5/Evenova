import { useState, useEffect } from "react";

export function useMedia(){
  const [s,setS]=useState({mobile:window.innerWidth<640,tablet:window.innerWidth<1024});
  useEffect(()=>{
    const h=()=>setS({mobile:window.innerWidth<640,tablet:window.innerWidth<1024});
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return s;
}
