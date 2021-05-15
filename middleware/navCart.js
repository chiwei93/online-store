module.exports = (req, res, next) => {
  if (!req.user) {
    res.locals.numCartItems = 0;
    return next();
  }

  let numCartItems = 0;
  req.user.cart.items.forEach(item => {
    numCartItems += item.quantity;
  });

  res.locals.numCartItems = numCartItems;
  next();
};
