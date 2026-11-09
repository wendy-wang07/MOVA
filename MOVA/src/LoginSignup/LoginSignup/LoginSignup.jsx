import React, {useState} from 'react'
import './LoginSignup.css'

import user_icon from '../Assets/user_icon.png'
import email_icon from '../Assets/email_icon.png'
import password_icon from '../Assets/password_icon.png' 

export const LoginSignup = () => {

    const [action, setAction] = useState("Login");

    return (
        <div className="container">
        <div className="header">
            <div className="text">{action}</div>
            <div className="underline"></div>
        </div>
        <div className="inputs">
            {action=== "Login"? <div></div>:<div className="input">
                <img src={user_icon} className="user_icon" alt="" />
                <input type="text" placeholder="Name"/>
            </div>}
            
             <div className="input">
                <img src={email_icon} className="email_icon" alt="" />
                <input type="email" placeholder='Email Id'/>
            </div>
            <div className="input">
                <img src={password_icon} className="password_icon" alt="" />
                <input type="password" placeholder='Password'/>
            </div>
        </div>
        {action==="Sign Up"?<div></div>:<div className="forgot-password">Lost Password? <span>Click here!</span></div>}
        <div className="submit-container">
            <div className={action=== "Login"?"submit gray":"submit"} onClick={()=>{setAction("Sign Up")}}>Sign Up</div>
            <div className={action=== "Sign Up"?"submit gray":"submit"} onClick={()=>{setAction("Login")}}>Login</div>
        </div>
    </div>
  )
}
