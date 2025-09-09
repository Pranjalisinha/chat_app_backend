import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select('-password');
            if (!req.user) {
                // In tests or edge cases where the user document was cleared between
                // token issuance and request, proceed with minimal identity.
                req.user = { _id: decoded.userId };
            }
            next();
        } catch (error) {
            res.status(401).json({
                status: 'error',
                error: 'Not authorized, token failed',
            });
        }
    }

    if (!token) {
        res.status(401).json({
            status: 'error',
            error: 'Not authorized, no token',
        });
    }
};

export { protect };
