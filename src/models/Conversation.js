const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    isGroup: {
        type: Boolean,
        default: false,
    },
    groupData: {
        name: String,
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        description: String,
        avatar: String,
    },
}, { timestamps: true });

// Index for finding conversations by participating users
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
