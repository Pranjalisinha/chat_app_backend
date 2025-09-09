import crypto from 'crypto';

// Encryption key should be 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY; // Make sure this is set in .env
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length

export const encryptMessage = (text) => {
    try {
        // Generate a random initialization vector
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher with AES-256-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        
        // Encrypt the message
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get authentication tag
        const authTag = cipher.getAuthTag();
        
        // Return everything needed for decryption
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Message encryption failed');
    }
};

export const decryptMessage = (encrypted) => {
    try {
        // Convert hex strings back to Buffers
        const iv = Buffer.from(encrypted.iv, 'hex');
        const authTag = Buffer.from(encrypted.authTag, 'hex');
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the message
        let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Message decryption failed');
    }
};
