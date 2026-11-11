import React from 'react'
import { UserAuth } from '../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

export const PrivateRoute = ({children}) => {
    const { session } = UserAuth();

    if(session === undefined){
        return <p>Loading...</p>;
    }

    return <>{session ? <>{children}</>: <Navigate to="/signup" />} </>;
};

export default PrivateRoute;