import Group from '../models/group.model.js';
import Message from '../models/message.model.js';

// Create new group
export const createGroup = async (req, res) => {
    try {
        const { name, description, members } = req.body;

        // Create group with current user as admin
        const group = await Group.create({
            name,
            description,
            admin: req.user._id,
            members: [...members, req.user._id]
        });

        const populatedGroup = await Group.findById(group._id)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');

        res.status(201).json({
            status: 'success',
            data: { group: populatedGroup }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get all groups user is member of
export const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage')
            .sort('-updatedAt');

        res.json({
            status: 'success',
            data: { groups }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get single group details
export const getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');

        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        // Check if user is member
        if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
            return res.status(403).json({
                status: 'error',
                error: 'Not authorized to access this group'
            });
        }

        res.json({
            status: 'success',
            data: { group }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Leave group
export const leaveGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        // Check if user is a member of the group
        if (!group.members.some(member => member.toString() === req.user._id.toString())) {
            return res.status(403).json({
                status: 'error',
                error: 'Not a member of this group'
            });
        }

        let isNewAdmin = false;
        // If user is admin, assign new admin before leaving
        if (group.admin.toString() === req.user._id.toString()) {
            // Find another member to make admin
            const newAdmin = group.members.find(
                memberId => memberId.toString() !== req.user._id.toString()
            );

            if (!newAdmin) {
                // If no other members, delete the group
                await Group.findByIdAndDelete(req.params.groupId);
                return res.json({
                    status: 'success',
                    message: 'Group deleted as no members remaining'
                });
            }

            group.admin = newAdmin;
            isNewAdmin = true;
        }

        // Remove user from members
        group.members = group.members.filter(
            memberId => memberId.toString() !== req.user._id.toString()
        );

        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');
        if (isNewAdmin) {
            res.json({
                status: 'success',
                message: 'You have left the group. A new admin has been assigned.',
                data: {
                    group: {
                        admin: updatedGroup.admin._id,
                    }
                }
            });
        } else {
            res.json({
                status: 'success',
                message: 'You have left the group.',
                data: {
                    group: updatedGroup,
                }
            });
        }

    } catch (error) {
        console.error('Error in leaveGroup:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
    // data: { group: updatedGroup }
    //     });
    // } catch (error) {
    //     res.status(500).json({
    //         status: 'error',
    //         error: 'Server error'
    //     });
    // }
};

// Update group
export const updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        // Check if user is admin
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                error: 'Only admin can update group'
            });
        }

        const { name, description, image } = req.body;
        group.name = name || group.name;
        group.description = description || group.description;
        group.image = image || group.image;

        const updatedGroup = await group.save();
        const populatedGroup = await Group.findById(updatedGroup._id)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');

        res.json({
            status: 'success',
            data: { group: populatedGroup }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Add members to group
export const addMembers = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        // Check if user is admin
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                error: 'Only admin can add members'
            });
        }

        const { members } = req.body;

        // Add new members
        group.members = [...new Set([...group.members, ...members])];

        const updatedGroup = await group.save();
        const populatedGroup = await Group.findById(updatedGroup._id)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');

        res.json({
            status: 'success',
            data: { group: populatedGroup }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Remove member from group
export const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        // Check if user is admin
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                error: 'Only admin can remove members'
            });
        }

        const { memberId } = req.params;

        // Remove member
        group.members = group.members.filter(
            member => member.toString() !== memberId.toString()
        );

        const updatedGroup = await group.save();
        const populatedGroup = await Group.findById(updatedGroup._id)
            .populate('admin', 'username email profilePic')
            .populate('members', 'username email profilePic')
            .populate('lastMessage');

        res.json({
            status: 'success',
            data: { group: populatedGroup }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};


