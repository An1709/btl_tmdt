export const authMe = async (req, res) => {
    try {
        const user = req.user; //lấy user từ middleware

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};  

export const test = async (req, res) => {
    return res.sendStatus(204);
};