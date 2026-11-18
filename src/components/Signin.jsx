import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext.jsx';
import '../components/Signin.css'

import email_icon from '../components/Assets/email_icon.png'
import password_icon from '../components/Assets/password_icon.png' 

export const Signin = () => {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setloading] = useState("");

const { session, signInUser } = UserAuth();
const navigate = useNavigate();
console.log(session);

const handleSignIn = async (e) => {
    e.preventDefault()
    setloading(true);
    try{
        const result = await signInUser(email, password);

        if(result.success){
            navigate("/dashboard");
        }
    } catch (err) {
        setError("an error occurred");
    } finally {
        setloading(false);
    }
}

  return (
    <div className= "container">
        <form onSubmit={handleSignIn}>
                <h2 className= "header">Sign in!</h2>
                <p className = "subtitle">
                Don't have an account? <Link to= "/Signup" className="text-blue-600">Sign up!</Link>
                </p>
                <div className= "inputs">
                <div className="input">
                    <img src={email_icon} className="email_icon" alt="" /> 
                    <input onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email" 
                    type= "email"/>
                </div>
                <div className= "input">
                    <img src={password_icon} className="password_icon" alt="" />
                    <input onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password" 
                    type= "password" />
                </div>
                </div>
                <div>
                    <button type="submit" disabled={loading} className="button">Sign in</button>
                    {error && <p className="text-red -600 text-center pt-4">{error}</p>}
                </div>
        </form>
    </div>
  )
}

export default Signin;