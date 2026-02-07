import {Router} from 'express';


const express = require('express');
const router = Router();
const {register,googleLogin,setNickname}= require('../controllers/userController');

router.post("/register",register);
router.post("/google",googleLogin);
router.post("/set-nickname",setNickname);

export default router;