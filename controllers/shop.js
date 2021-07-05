const Order = require('../models/order');
const Product = require('../models/product');
const Review = require('../models/review');
const emailTransporter = require('../util/email');
const PRODUCTS_PER_PAGE = require('../util/productsPerPage');

//rendering index page
exports.getIndexPage = (req, res, next) => {
  Product.find()
    .limit(10)
    .sort({ rating: -1 })
    .then(products => {
      return res.render('shop/index', {
        path: '/',
        pageTitle: 'Shop',
        products,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//rendering search page
exports.getSearch = (req, res, next) => {
  const { searchTerm } = req.params;

  const page = req.query.page || 1;

  let totalSearchResults;

  //find the appropriate products by searching either the title or category containing the searchterm and count the documents
  Product.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
    ],
  })
    .countDocuments()
    .then(numProducts => {
      totalSearchResults = numProducts;

      //find the products and implement pagination
      return Product.find({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
        ],
      })
        .skip((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE)
        .sort({ rating: -1 });
    })
    .then(products => {
      //calculating the last page
      const lastPage = Math.ceil(totalSearchResults / PRODUCTS_PER_PAGE);

      //render the page
      res.render('shop/search', {
        path: '/products',
        pageTitle: 'Search Results',
        products,
        searchTerm,
        totalSearchResults,
        startResult: (page - 1) * PRODUCTS_PER_PAGE + 1,
        endResult: page * PRODUCTS_PER_PAGE,
        lastPage,
        currentPage: page,
        hasNextPage: page < lastPage,
        hasPreviousPage: page > 1,
        nextPage: +page + 1,
        previousPage: page - 1,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//handling search on searchbar
exports.postSearch = (req, res, next) => {
  const { searchTerm } = req.body;

  //redirect back to search page with the search term
  res.redirect(`/search/${searchTerm}`);
};

//rendering single product page
exports.getProduct = (req, res, next) => {
  const { productId } = req.params;

  let fetchProduct;

  //find the product in the database
  Product.findById(productId)
    .then(product => {
      //check if product exist
      if (!product) {
        return res.redirect('/products');
      }

      fetchProduct = product;

      //find all the reviews for the product
      return Review.find({ productId }).populate('userId');
    })
    .then(reviews => {
      //render the page
      res.render('shop/product-detail', {
        path: '/products',
        pageTitle: 'Product',
        product: fetchProduct,
        reviews,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//rendering products page
exports.getProducts = (req, res, next) => {
  const page = req.query.page || 1;

  let totalProducts;

  //count the product documents
  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalProducts = numProducts;

      //return the correct products for each page
      return Product.find()
        .skip((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE)
        .sort({ rating: -1 });
    })
    .then(products => {
      //render the products page
      res.render('shop/products', {
        path: '/products',
        pageTitle: 'Products',
        products,
        lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
        currentPage: page,
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
        previousPage: +page - 1,
        nextPage: +page + 1,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//rendering orders page
exports.getOrders = (req, res, next) => {
  const { user } = req;

  Order.find({ 'user.userId': user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//handling creating order
exports.postOrder = (req, res, next) => {
  const { user } = req;

  //create an array of product Id
  const idArr = user.cart.items.map(item => {
    return item.productId;
  });

  //get the cart items
  const cartItems = user.cart.items;

  let fetchedOrder;

  user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      //create the products arr for the order
      const products = user.cart.items.map(item => {
        return {
          product: { ...item.productId },
          quantity: item.quantity,
        };
      });

      //create user obj
      const userObj = { email: user.email, userId: user._id };

      //save the order to the database
      return Order.create({ user: userObj, products });
    })
    .then(order => {
      fetchedOrder = order;

      let bulkArr = [];

      // decrease the quantity of the products
      cartItems.forEach(item => {
        bulkArr.push({
          updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { quantity: `-${item.quantity}` } },
          },
        });
      });

      //update quantity of the items in the database
      return Product.bulkWrite(bulkArr);
    })
    .then(results => {
      //empty the user cart
      user.cart.items = [];

      //save it to the database
      return user.save();
    })
    .then(user => {
      //redirect back to orders
      res.redirect('/orders');

      const productTexts = fetchedOrder.products.map(product => {
        return `${product.product.title} (${product.quantity})`;
      });

      return emailTransporter.sendMail({
        to: user.email,
        from: process.env.FROM_EMAIL,
        subject: 'Order Confirmed',
        html: `
            <p>Your order #${fetchedOrder._id} had been confirmed</p>
            <p>The order consists of ${productTexts.join(', ')}.</p>
        `,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//rendering about us page
exports.getAboutUs = (req, res, next) => {
  res.render('shop/about-us', {
    path: '/about-us',
    pageTitle: 'About Us',
  });
};

//rendering terms page
exports.getTerms = (req, res, next) => {
  res.render('shop/terms', {
    path: '/terms',
    pageTitle: 'Terms & Services',
  });
};

//rendering contact us page
exports.getContactUs = (req, res, next) => {
  res.render('shop/contact-us', {
    path: '/contact-us',
    pageTitle: 'Contact Us',
  });
};
