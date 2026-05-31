export const getAccessTokenSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
