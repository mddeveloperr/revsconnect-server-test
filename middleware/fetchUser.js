var jwt = require('jsonwebtoken');
const JWT_SECRET = 'HELLOIAMVERYDIFFICULTSEVERSOFAR';

const fetchuser = (req, res, next) => {
    // Get the user from the jwt token and add id to req object
    const token = req.header('token');
    if (!token) {
        res.status(400).send({ error: " Login Expired: Please authenticate using a valid token" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;
        next();
    } catch (error) {
        res.status(400).send({ error: "Login Expired: Please authenticate using a valid token" })
    }

}


module.exports = fetchuser;