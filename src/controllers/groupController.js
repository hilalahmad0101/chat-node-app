const crypto = require('crypto');

exports.createGroup = async (req, res) => {
    try {
        const { name, members, description, avatar, groupType } = req.body;
        const groupMembers = [...new Set([...members, req.user._id.toString()])];
        const inviteCode = crypto.randomBytes(4).toString('hex'); // Generate unique code

        const conversation = await Conversation.create({
            participants: groupMembers,
            isGroup: true,
            groupData: { name, admin: req.user._id, description, avatar }
        });

        const group = await Group.create({
            name,
            admin: req.user._id,
            members: groupMembers,
            conversationId: conversation._id,
            description,
            avatar,
            groupType: groupType || 'private',
            inviteCode: groupType === 'public' ? inviteCode : undefined
        });

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can add members' });
        }

        if (!group.members.includes(userId)) {
            group.members.push(userId);
            await group.save();
            await Conversation.findByIdAndUpdate(group.conversationId, { $addToSet: { participants: userId } });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.joinByCode = async (req, res) => {
    try {
        const { inviteCode } = req.params;
        const group = await Group.findOne({ inviteCode });

        if (!group) return res.status(404).json({ message: 'Invalid or expired invite link' });

        if (!group.members.includes(req.user._id)) {
            group.members.push(req.user._id);
            await group.save();
            await Conversation.findByIdAndUpdate(group.conversationId, { $addToSet: { participants: req.user._id } });
        }

        res.json({ message: 'Joined successfully', group });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleAdminOnly = async (req, res) => {
    try {
        const { groupId, status } = req.body; // status: true/false
        const group = await Group.findById(groupId);

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can change settings' });
        }

        group.settings.onlyAdminCanMessage = status;
        await group.save();

        res.json({ message: `Admin-only messaging ${status ? 'enabled' : 'disabled'}`, group });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const group = await Group.findById(groupId);

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can remove members' });
        }

        group.members = group.members.filter(id => id.toString() !== userId);
        await group.save();

        await Conversation.findByIdAndUpdate(group.conversationId, { $pull: { participants: userId } });

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
