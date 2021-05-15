const { validationResult } = require('express-validator');

const Review = require('../models/review');
const Order = require('../models/order');
const Product = require('../models/product');

//rendering the review form
exports.getReviewProduct = (req, res, next) => {
  const { productId } = req.params;

  const orderId = req.query.order;

  res.render('admin/review', {
    path: '/admin/products',
    pageTitle: 'Review',
    productId,
    formValues: { review: '', rating: '' },
    validationErrors: [],
    hasRatingError: false,
    orderId,
  });
};

//for handling the create review process
exports.postReview = (req, res, next) => {
  const { productId, review, rating, orderId } = req.body;

  const results = validationResult(req);

  //check for validation errors
  if (!results.isEmpty() || !rating) {
    return res.render('admin/review', {
      path: '/admin/products',
      pageTitle: 'Review',
      productId,
      formValues: { review, rating },
      validationErrors: results.errors,
      hasRatingError: !rating,
    });
  }

  //create review
  Review.create({ review, rating: +rating, productId, userId: req.user._id })
    .then(review => {
      //find all the reviews
      return Review.find({ productId });
    })
    .then(reviews => {
      //get all the ratings of the product
      const ratings = reviews.map(review => review.rating);

      const totalReviews = reviews.length;

      let totalRating = 0;

      //calculate the total sum of the rating
      ratings.forEach(rating => {
        totalRating += rating;
      });

      //calculate the avg rating
      const avgRating = totalRating / totalReviews;

      //update the product's rating in the database
      return Product.findByIdAndUpdate(
        productId,
        { rating: avgRating },
        { new: true }
      );
    })
    .then(product => {
      //find the order in which review is made
      return Order.findById(orderId);
    })
    .then(order => {
      const productIndex = order.products.findIndex(
        el => el.product._id.toString() === productId.toString()
      );

      order.products[productIndex].reviewed = true;

      //update the database that the review for the product is made
      return order.save();
    })
    .then(order => {
      //redirecting back to the orders page
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};
