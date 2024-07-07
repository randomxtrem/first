const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const authQueries = require('../queries/authQueries');
const userQueries = require('../queries/userQueries');
const httpError = require('../error/httpError');
const HttpError = require('../error/httpError');
const { attachCookieToResponse } = require('../utils/jwt')

const register = async (req,res)=>{
    try {
        const {username, password, email, gender} = req.body;
        if(!username || !email || !password || !gender){
            res.redirect('/register');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const check = await pool.query(userQueries.checkEmailExists, [email]);
        if(check.rows.length){
            throw new httpError("Email already exists!", 400);
        }
        try{ 
            await pool.query(authQueries.addUser, [username, email, hashedPassword, gender])
        } catch(err){
            console.log(err);
            throw new HttpError(err, 500);
        }
        res.status(200).send("registered successfully")
       }
    catch(httpError){
       res.status(httpError.status).send(httpError.msg);
    }

}

const login = async (req,res)=>{
    try {
        const {email, password} = req.body;
        if (!email || !password){
            res.redirect('/login');
        }
        if(!(await pool.query(userQueries.checkEmailExists, [email])).rows.length)
            throw new httpError("Invalid credentials!", 400);

        const results = await pool.query(authQueries.checkPassword, [email]);
        const password_hash  = results.rows[0].password;
        const passwordMatched = await bcrypt.compare(password, password_hash);
        if(!passwordMatched)
             throw new httpError("Invalid credentials!", 400);

        try{
        const getuser = await pool.query(userQueries.getUserFromEmail, [email]);

        const user = getuser.rows[0].user_id;
        attachCookieToResponse({res, user});
        res.send("logged in").status(200);
        }catch(err){
            
             throw new httpError(err, 500);
        }
    }
    catch(httpError){
        console.log(httpError)
        res.status(httpError.status).send(httpError.msg);
    }

}

module.exports = {
    register,
    login,
}