"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversation_controller_1 = require("../controllers/conversation.controller");
const router = (0, express_1.Router)();
/**
 * GET /api/conversations/:userId
 * Get all conversations for a user
 * NOTE: No authentication required - allows loading chats without login
 */
router.get('/:userId', conversation_controller_1.getConversations);
/**
 * GET /api/conversations/:userId/:conversationId
 * Get a specific conversation
 * NOTE: No authentication required - allows loading chats without login
 */
router.get('/:userId/:conversationId', conversation_controller_1.getConversation);
/**
 * POST /api/conversations/:userId
 * Save a conversation
 * NOTE: No authentication required - allows saving chats without login
 */
router.post('/:userId', conversation_controller_1.saveConversation);
/**
 * DELETE /api/conversations/:userId/:conversationId
 * Delete a conversation
 * NOTE: No authentication required - allows deleting chats without login
 */
router.delete('/:userId/:conversationId', conversation_controller_1.deleteConversation);
exports.default = router;
