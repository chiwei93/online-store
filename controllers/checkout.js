require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//render the checkout page
exports.getCheckout = (req, res, next) => {
  const { user } = req;

  let totalSum;
  let products;

  //populate the cart with the products info
  user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      //calculate the total price
      totalSum = 0;
      products = user.cart.items;

      let notSoldOut = true;
      let soldOutProductIndex;

      products.forEach((item, index) => {
        totalSum += item.productId.price * item.quantity;

        //check if the product is sold out
        if (item.quantity > item.productId.quantity) {
          notSoldOut = false && isSoldOut;
          soldOutProductIndex = index;
        }
      });

      //if sold out
      if (!notSoldOut) {
        const productTitle = products[soldOutProductIndex].productId.title;

        //flash error message
        req.flash(
          'cartError',
          `${productTitle} just sold out. Please delete it from the cart to continue.`
        );

        //redirect back to the cart page
        return res.redirect('/cart');
      }

      //create a stripe session
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(product => {
          return {
            price_data: {
              currency: 'myr',
              product_data: {
                name: product.productId.title,
              },
              unit_amount: product.productId.price * 100,
            },
            quantity: product.quantity,
          };
        }),
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
      });
    })
    .then(stripeSession => {
      //render the page with stripe session id
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Check Out',
        cartItems: user.cart.items,
        totalSum,
        sessionId: stripeSession.id,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};
