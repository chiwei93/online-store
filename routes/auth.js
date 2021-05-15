const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password should be at least 8 characters long')
      .trim(),
  ],
  authController.postLogin
);

router.get('/signup', authController.getSignup);

router.post(
  '/signup',
  [
    body('name')
      .isLength({ min: 1 })
      .withMessage('Name must be at least 5 characters long'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password should be at least 8 characters long')
      .trim(),
    body('passwordConfirm')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords provided do not match');
        }

        return true;
      }),
  ],
  authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/forgot-password', authController.getForgottenPassword);

router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email.')
      .normalizeEmail(),
  ],
  authController.postForgottenPassword
);

router.get('/reset/:token', authController.getReset);

router.post(
  '/new-password',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('A password should be at least 8 characters long')
      .trim(),
    body('passwordConfirm')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords provided do not match');
        }

        return true;
      }),
  ],
  authController.postNewPassword
);

module.exports = router;
