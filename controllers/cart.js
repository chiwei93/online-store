const Product = require('../models/product');

//rendering cart page
exports.getCart = (req, res, next) => {
  const { user } = req;

  let messages = req.flash('cartError');

  if (messages.length > 0) {
    messages = messages[0];
  } else {
    messages = null;
  }

  //populate the cart with the products info
  user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      //calculate the total price
      let totalSum = 0;
      products = user.cart.items;

      user.cart.items.forEach(item => {
        totalSum += item.productId.price * item.quantity;
      });

      //render page
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        cartItems: user.cart.items,
        totalSum,
        cartErrorMsg: messages,
      });
    })

    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//handle add to cart process
exports.postAddToCart = (req, res, next) => {
  const { productId } = req.body;

  const { user } = req;

  //get user's cart
  const cartItems = user.cart.items;

  Product.findById(productId)
    .then(product => {
      //check if product exist
      if (!product) {
        return res.redirect('/products');
      }

      //find index of the product
      const productIndex = cartItems.findIndex(
        item => item.productId.toString() === product._id.toString()
      );

      let newCart = [...cartItems];

      //check if product already exist in the cart
      if (productIndex < 0) {
        //if false, add the product to the cart
        const productItem = { productId: product._id, quantity: 1 };

        newCart.push(productItem);
      } else {
        //if true, change the quantity of the product
        newCart[productIndex].quantity = +newCart[productIndex].quantity + 1;
      }

      user.cart = { items: newCart };

      //update the database with the new info
      return user.save();
    })
    .then(user => {
      //redirect back to the cart page
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//for handling where user add the product quanlity
exports.postAddProductQty = (req, res, next) => {
  const { productId } = req.params;

  const { user } = req;

  //get the user cart
  const newCartItems = [...user.cart.items];

  Product.findById(productId)
    .then(product => {
      //find the appropriate product
      const productIndex = newCartItems.findIndex(
        item => item.productId.toString() === productId.toString()
      );

      //check if product exist
      if (productIndex < 0) {
        //return json response
        return res.status(400).json({ message: 'Product not found' });
      }

      const maxQuantity = product.quantity;

      //check if quantity reached the max quantity
      if (newCartItems[productIndex].quantity === maxQuantity) {
        return res.status(400).json({ message: 'Max Quantity reached' });
      }

      //increase the product quantity if exist
      newCartItems[productIndex].quantity =
        newCartItems[productIndex].quantity + 1;

      user.cart.items = newCartItems;

      //save to database
      return user.save();
    })
    .then(user => {
      //populate the productId
      return user.populate('cart.items.productId').execPopulate();
    })
    .then(user => {
      //return the cart information
      res.status(200).json({ cart: user.cart });
    })
    .catch(err => {
      res.status(500).json({ message: 'Updating quantity failed' });
    });
};

//handling when the user decrease the quantity of the product
exports.postMinusProductQty = (req, res, next) => {
  const { productId } = req.params;

  const { user } = req;

  //get user's cart
  const newCartItems = [...user.cart.items];

  //find index of product
  const productIndex = newCartItems.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  //check if product exist
  if (productIndex < 0) {
    return res.status(400).json({ message: 'Product not found' });
  }

  //check if quantity equal to 1
  if (+newCartItems[productIndex].quantity === 1) {
    return res
      .status(400)
      .json({ message: 'Minimum number for the quantity reached' });
  }

  //decrease the quantity if pass both checks
  newCartItems[productIndex].quantity = newCartItems[productIndex].quantity - 1;

  user.cart.items = newCartItems;

  //update the database with the new data
  user
    .save()
    .then(user => {
      return user.populate('cart.items.productId').execPopulate();
    })
    .then(user => {
      //return the cart information
      res.status(200).json({ cart: user.cart });
    })
    .catch(err => {
      res.status(500).json({ message: 'Updating quantity failed' });
    });
};

//handling deleting items from cart
exports.postDeleteCartItem = (req, res, next) => {
  const { productId } = req.body;

  const { user } = req;

  //get user's cart
  const newCartItems = [...user.cart.items];

  //find index of product
  const productIndex = newCartItems.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  //check if product exist
  if (productIndex < 0) {
    //redirect back to the cart page
    return res.redirect('/cart');
  }

  //filter out the product from the cart
  const filterCartItems = newCartItems.filter(
    item => item.productId.toString() !== productId
  );

  user.cart.items = filterCartItems;

  //update the database with the new info
  user
    .save()
    .then(user => {
      //redirect back to the cart page
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};
