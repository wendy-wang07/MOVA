import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { UserAuth } from '../context/AuthContext.jsx';

import email_icon from '../components/Assets/email_icon.png'
import password_icon from '../components/Assets/password_icon.png' 
import user_icon from '../components/Assets/user_icon.png'

export const Signup = () => {
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setloading] = useState("");

const { session, signUpNewUser } = UserAuth();
const navigate = useNavigate();
console.log(session);

const handleSignUp = async (e) => {
    e.preventDefault()
    setloading(true);
    try{
        const result = await signUpNewUser(email, password, username);

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
    <div  className="container">
        <form onSubmit={handleSignUp}>
                <h2 className= "font-bold pb-2">Sign up today!</h2>
                <p className = "mb-4">
                Already have an account? <Link to= "/Signin" className="text-blue-600">Sign in!</Link>
                </p>
                <div className= "inputs">
                <div className="input">
                    <img src={user_icon} className="user_icon" alt="" />
                    <input
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    type="text"
                    autoComplete="nickname"
                    required
                    />
                </div>
                <div className="input">
                    <img src={email_icon} className="email_icon" alt="" />
                    <input
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    required
                    />
                </div>
                <div className= "input">
                    <img src={password_icon} className="password_icon" alt="" />
                    <input
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    />
                </div>
                </div>
                <div>
                    <button type="submit" disabled={loading} className="button">Sign up</button>
                    {error && <p className="text-red -600 text-center pt-4">{error}</p>}
                </div>
        </form>
    </div>
  )
}

export default Signup;