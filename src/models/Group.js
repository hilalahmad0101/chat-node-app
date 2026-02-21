const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: String,
    avatar: String,
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
    },
    groupType: {
        type: String,
        enum: ['public', 'private'],
        default: 'private',
    },
    inviteCode: {
        type: String,
        unique: true,
        sparse: true,
    },
    settings: {
        onlyAdminCanMessage: {
            type: Boolean,
            default: false,
        },
    },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
