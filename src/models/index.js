import User from './user.model.js';
import {Group, GroupMember} from './group.model.js';
import Message from './message.model.js';

// User-User relationships (contacts)
User.belongsToMany(User, {
    through: 'Contacts',
    as: 'contacts',
    foreignKey: 'userId',
    otherKey: 'contactId'
});

// Group-User relationships
User.belongsToMany(Group, {
    through: GroupMember,
    foreignKey: 'userId'
});

Group.belongsToMany(User, {
    through: GroupMember,
    foreignKey: 'groupId'
});

// Message relationships
Message.belongsTo(User, {
    as: 'sender',
    foreignKey: 'senderId'
});

Message.belongsToMany(User, {
    through: 'MessageReads',
    as: 'readBy',
    foreignKey: 'messageId'
});

// For private messages
Message.belongsTo(User, {
    as: 'recipient',
    foreignKey: 'recipientId'
});

// For group messages
Message.belongsTo(Group, {
    as: 'group',
    foreignKey: 'groupId'
});

module.exports = {
    User,
    Group,
    GroupMember,
    Message
};
