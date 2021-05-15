const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');
const reviewController = require('../controllers/review');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.get('/products', isAuth, adminController.getProducts);

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post(
  '/add-product',
  [
    body('title')
      .isLength({ min: 3 })
      .withMessage('A title should be at least 3 characters long')
      .trim(),
    body('price').isFloat().withMessage('The price should be a float'),
    body('description')
      .isLength({ min: 5 })
      .withMessage('A description should be at least 5 characters long.')
      .trim(),
    body('quantity').isInt().withMessage('Quantity should be an Integer'),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title')
      .isLength({ min: 3 })
      .withMessage('A title should be at least 3 characters long')
      .trim(),
    body('price').isFloat().withMessage('The price should be a float'),
    body('description')
      .isLength({ min: 5 })
      .withMessage('A description should be at least 5 characters long.')
      .trim(),
  ],
  isAuth,
  adminController.postEditProduct
);

router.post('/delete-product', isAuth, adminController.postDeleteProduct);

router.get('/review/:productId', isAuth, reviewController.getReviewProduct);

router.post(
  '/review',
  [
    body('review')
      .isLength({ min: 3 })
      .withMessage('A review should be at least 3 characters long')
      .trim(),
  ],
  isAuth,
  reviewController.postReview
);

module.exports = router;
