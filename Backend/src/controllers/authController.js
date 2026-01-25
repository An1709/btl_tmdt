import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m'; // 30 phút
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body; 

        if (!username || !email || !password || !firstName || !lastName) {
            return res
                .status(400)
                .json({ message: 'All fields are required' });
        }

        const duplicateUser = await User.findOne({ $or: [ { username }, { email } ] });
        if (duplicateUser) { //kiem tra trung username hoac email
            return res
                .status(409)
                .json({ message: 'Username or email already in use' });
        } 

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            hashedPassword,
            displayName: `${firstName} ${lastName}`,
        });

        return res.status(201).json({ message: 'User created' });
    } catch (error) {
        console.error('Error during sign up:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const signIn = async (req, res) => {
    try {
        //lấy input
        const { username, password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: 'Username and password are required' });
        }

        //lấy hash password từ db để so sánh
        const user = await User.findOne({ username });
        if (!user) { //nếu không tìm thấy user
            return res
                .status(401)
                .json({ message: 'Invalid username or password' });
        }

        //so sánh password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordCorrect) {
            return res
                .status(401)
                .json({ message: 'Invalid username or password' });
        } 

        //nếu khớp, tạo access token 
        const accessToken = jwt.sign(
            {userId: user._id},
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL },
        );

        //tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');

        //tạo session lưu refresh token vào db 
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL), //14 ngày
        });
        
        // trả về refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            // Nếu đang chạy dưới local thì false, deploy thì true
            secure: false, 
            // Ở local dùng lax để trình duyệt chấp nhận cookie
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_TTL, 
        });

        // trả về access token về cho response
        return res.status(200)
            .json({ 
                message: `User ${user.displayName} đã login vào trang`,
                accessToken,
            });
    } catch (error) {
        console.error('Error during sign in:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const signOut = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {   

            //xóa session trong db
            await Session.deleteOne({ refreshToken: refreshToken });
         
            //xóa refresh token trong cookie
            res.clearCookie('refreshToken');
        }
        return res.sendStatus(204); // logout thành công dù có hay không
    } catch (error) {
        console.error('Error during sign out:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
}; 

export const refreshToken = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }
        // so sánh token với db
        const session = await Session.findOne({ refreshToken: refreshToken });
        if (!session) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
        //kiểm tra token có hết hạn không
        if (session.expiresAt < new Date()) {
            await Session.deleteOne({ refreshToken: refreshToken });
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Refresh token expired' });
        }

        //tạo access token mới
        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL },
        );
        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Error during token refresh:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

