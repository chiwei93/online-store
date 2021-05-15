const express = require('express');

const shopController = require('../controllers/shop');
const checkoutController = require('../controllers/checkout');
const cartController = require('../controllers/cart');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.get('/', shopController.getIndexPage);

router.get('/search/:searchTerm', shopController.getSearch);

router.post('/search', shopController.postSearch);

router.get('/products/:productId', shopController.getProduct);

router.get('/products', shopController.getProducts);

router.post(
  '/add-product-quantity/:productId',
  cartController.postAddProductQty
);

router.post(
  '/minus-product-quantity/:productId',
  cartController.postMinusProductQty
);

router.get('/cart', isAuth, cartController.getCart);

router.post('/add-to-cart', isAuth, cartController.postAddToCart);

router.post('/delete-cart-item', isAuth, cartController.postDeleteCartItem);

router.get('/checkout/success', isAuth, shopController.postOrder);

router.get('/checkout/cancel', isAuth, cartController.getCart);

router.get('/checkout', isAuth, checkoutController.getCheckout);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/about-us', shopController.getAboutUs);

router.get('/terms', shopController.getTerms);

router.get('/contact-us', shopController.getContactUs);

module.exports = router;
