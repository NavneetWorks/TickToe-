import {Router} from 'express';

const express = require('express');
const router = Router();
const {friendList,searchUsers,sendFriendRequest,rejectFriendRequest,acceptFriendRequest,getPendingRequests}
 = require('../controllers/chatController');

router.get("/friends",friendList);
router.get("/search/:term",searchUsers);
router.post("/request",sendFriendRequest);
router.get("/friends/pending",getPendingRequests);
router.post("/friends/accept/:requestId",acceptFriendRequest);
router.post("/friends/reject/:requestId",rejectFriendRequest);

export default router;