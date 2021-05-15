const { validationResult } = require('express-validator');

const Product = require('../models/product');
const PRODUCTS_PER_PAGE = require('../util/productsPerPage');

//rendering your products page
exports.getProducts = (req, res, next) => {
  const { user } = req;

  const page = req.query.page || 1;

  let totalProducts;

  //find all the products of a specific user and count the products
  Product.find({ userId: user })
    .countDocuments()
    .then(numProducts => {
      totalProducts = numProducts;

      //find the correct products from the database
      return Product.find({ userId: user })
        .skip((page - 1) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE);
    })
    .then(products => {
      //rendering the your products page
      res.render('admin/products', {
        path: '/admin/products',
        pageTitle: 'Your Products',
        products,
        currentPage: page,
        lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
        hasNextPage: page < Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
        hasPreviousPage: page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//rendering the add product form
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    path: '/admin/products',
    pageTitle: 'Add Product',
    isEditing: false,
    validationErrors: [],
    formValues: {
      title: '',
      price: '',
      description: '',
      quantity: '',
      category: '',
    },
    imageErrorMsg: null,
    hasCategoryValidationError: false,
  });
};

//handling add product process
exports.postAddProduct = (req, res, next) => {
  const { title, price, description, quantity, category } = req.body;

  const image = req.file;

  const results = validationResult(req);

  // for validation check
  if (!results.isEmpty() || !category) {
    return res.render('admin/edit-product', {
      path: '/admin/products',
      pageTitle: 'Add Product',
      isEditing: false,
      validationErrors: results.errors,
      formValues: { title, price, description, quantity, category },
      imageErrorMsg: null,
      hasCategoryValidationError: !category,
    });
  }

  //check if user upload an image for the product
  if (!image) {
    return res.render('admin/edit-product', {
      path: '/admin/products',
      pageTitle: 'Add Product',
      isEditing: false,
      validationErrors: [],
      formValues: { title, price, description, quantity, category },
      imageErrorMsg: 'Please upload an image in the format of png, jpg or jpeg',
      hasCategoryValidationError: false,
    });
  }

  //getting the image url after the image is uploaded to s3
  const imageUrl = image.location;

  //save the product to the database
  Product.create({
    title,
    price,
    description,
    imageUrl,
    quantity,
    category,
    userId: req.user._id,
  })
    .then(product => {
      //redirect back to your products page
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//for rendering the edit form
exports.getEditProduct = (req, res, next) => {
  const { productId } = req.params;

  //find the product and render the form with the values
  Product.findById(productId)
    .then(product => {
      const { title, price, description, _id, quantity, category } = product;

      res.render('admin/edit-product', {
        path: '/admin/products',
        pageTitle: 'Edit Product',
        isEditing: true,
        validationErrors: [],
        formValues: { title, price, description, quantity, category },
        imageErrorMsg: null,
        productId: _id,
        hasCategoryValidationError: false,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//for handling the edit product process
exports.postEditProduct = (req, res, next) => {
  const { title, price, description, productId, quantity, category } = req.body;

  const results = validationResult(req);

  const image = req.file;

  //validation checks of value entered
  if (!results.isEmpty() || !category) {
    return res.render('admin/edit-product', {
      path: '/admin/products',
      pageTitle: 'Edit Product',
      isEditing: true,
      validationErrors: results.errors,
      formValues: { title, price, description, quantity, category },
      imageErrorMsg: null,
      hasCategoryValidationError: !category,
    });
  }

  //find the product in the database and update the product
  Product.findOne({ _id: productId, userId: req.user._id })
    .then(product => {
      product.title = title;
      product.price = price;
      product.description = description;
      product.quantity = quantity;
      product.category = category;

      //only update the imageUrl if a file is provided
      if (image) {
        product.imageUrl = image.location;
      }

      product.updatedAt = Date.now();

      return product.save();
    })
    .then(product => {
      //redirect back to your products page
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//for handling the delete product process
exports.postDeleteProduct = (req, res, next) => {
  const { productId } = req.body;

  Product.findOneAndDelete({ _id: productId, userId: req.user._id })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};
