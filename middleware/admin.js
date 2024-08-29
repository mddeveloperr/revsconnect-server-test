function admin(req, res, next) {
    console.log("req.user:", req.user); // Log the user object attached to the request
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).send("You are not authorized to access this resource");
    }
    next();
  }
  
  module.exports = admin;
  