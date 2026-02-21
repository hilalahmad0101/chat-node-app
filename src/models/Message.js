const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        trim: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text',
    },
    fileUrl: String,
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    },
    deliveredAt: Date,
    seenAt: Date,
    isEdited: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    isForwarded: {
        type: Boolean,
        default: false,
    },
    originalMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
}, { timestamps: true });

// Optimize indexes for fast retrieval of conversation history
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
