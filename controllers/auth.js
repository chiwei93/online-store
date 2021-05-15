const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const emailTransporter = require('../util/email');

//rendering login page
exports.getLogin = (req, res, next) => {
  //get flash success messages
  let messages = req.flash('successMsg');

  if (messages.length > 0) {
    messages = messages[0];
  } else {
    messages = null;
  }

  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    validationErrors: [],
    formValues: { email: '', password: '' },
    loginErrorMsg: null,
    successMsg: messages,
  });
};

//handling login process
exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;

  const results = validationResult(req);

  //check for validation errors
  if (!results.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      validationErrors: results.errors,
      formValues: { email, password },
      loginErrorMsg: null,
      successMsg: null,
    });
  }

  let fetchedUser;

  //find if user exist
  User.findOne({ email })
    .then(user => {
      //if user doesn't exist
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          validationErrors: results.errors,
          formValues: { email, password },
          loginErrorMsg: 'Invalid email or password. Please try again.',
          successMsg: null,
        });
      }

      fetchedUser = user;

      //if user exist, check password
      return bcrypt.compare(password, user.password);
    })
    .then(doMatch => {
      //if password don't match
      if (!doMatch) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          validationErrors: results.errors,
          formValues: { email, password },
          loginErrorMsg: 'Invalid email or password. Please try again.',
          successMsg: null,
        });
      }

      //save logged in status and user on session
      req.session.isLoggedIn = true;
      req.session.user = fetchedUser;
      req.session.save(err => {
        if (err) {
          const error = new Error(err);

          error.httpStatusCode = 500;

          return next(error);
        }

        //redirect back to index page when it finishes saving
        res.redirect('/');
      });
    })
    .catch(err => {
      res.redirect('/login');
    });
};

//rendering the signup page
exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Sign Up',
    validationErrors: [],
    formValues: { name: '', email: '', password: '', passwordConfirm: '' },
  });
};

//handling signup process
exports.postSignup = (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  const results = validationResult(req);

  //check for validation errors
  if (!results.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Sign Up',
      validationErrors: results.errors,
      formValues: { name, email, password, passwordConfirm },
    });
  }

  //check if email already registered in the database
  User.findOne({ email: email })
    .then(user => {
      //check if user exist
      if (user) {
        return res.status(422).render('auth/signup', {
          path: '/signup',
          pageTitle: 'Sign Up',
          validationErrors: [
            {
              param: 'email',
              msg: 'Email already registered. Please sign up with a different email.',
            },
          ],
          formValues: { name, email, password, passwordConfirm },
        });
      }

      //if user doesn't exist, hash the password
      return bcrypt.hash(password, 12);
    })
    .then(hashedPassword => {
      //create the user
      return User.create({
        name,
        email,
        password: hashedPassword,
        cart: { items: [] },
      });
    })
    .then(user => {
      //flash success messsage
      req.flash(
        'successMsg',
        'Your account was created successfully. Please login to your account.'
      );

      //redirect back to the login page
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      next(error);
    });
};

//handling logout
exports.postLogout = (req, res, next) => {
  //delete the session from the database
  req.session.destroy(err => {
    res.redirect('/');
  });
};

//rendering forgotten password page
exports.getForgottenPassword = (req, res, next) => {
  //get flash error messages
  let messages = req.flash('error');

  if (messages.length > 0) {
    messages = messages[0];
  } else {
    messages = null;
  }

  res.render('auth/forgot-password', {
    path: '/login',
    pageTitle: 'Forgot Password',
    validationErrors: [],
    formValues: { email: '' },
    emailErrorMsg: null,
    flashErrorMsg: messages,
  });
};

//for handling forgotten password process
exports.postForgottenPassword = (req, res, next) => {
  const { email } = req.body;

  const results = validationResult(req);

  //check for validation errors
  if (!results.isEmpty()) {
    return res.status(422).render('auth/forgot-password', {
      path: '/login',
      pageTitle: 'Forgot Password',
      validationErrors: results.errors,
      formValues: { email },
      emailErrorMsg: null,
      flashErrorMsg: null,
    });
  }

  //check if email exist
  User.findOne({ email }).then(user => {
    //if false
    if (!user) {
      return res.status(422).render('auth/forgot-password', {
        path: '/login',
        pageTitle: 'Forgot Password',
        validationErrors: [],
        formValues: { email },
        emailErrorMsg: 'Email does not exist.',
        flashErrorMsg: null,
      });
    }

    //create resetToken and resetTokenExpiration
    crypto.randomBytes(32, (err, buffer) => {
      //if error occurred
      if (err) {
        //flash an error message
        req.flash(
          'error',
          'Resetting password process failed. Please try again.'
        );
        return res.redirect('/forgot-password');
      }

      //create a reset token
      const token = buffer.toString('hex');

      //update the user's resetToken adn resetTokenExpiration in the database
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;

      user
        .save()
        .then(user => {
          //flash success message
          req.flash(
            'successMsg',
            'An email with the reset token had been sent to your email.'
          );

          //redirect to login page
          res.redirect('/login');

          //send email to user
          return emailTransporter.sendMail({
            to: email,
            subject: 'Reset Password',
            html: `
                <p>You have requested a password reset.</p>
                <p>Click <a href="/reset/${user.resetToken}">this link</a> to reset your password.</p>
                <p>Please ignore this message if you did not request a password reset.</p>
              `,
          });
        })
        .catch(err => {
          const error = new Error(err);

          error.httpStatusCode = 500;

          return next(error);
        });
    });
  });
};

//rendering reset password page
exports.getReset = (req, res, next) => {
  const { token } = req.params;

  //check if token is valid and whether it expires
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      //if user doesn't exist
      if (!user) {
        //flash error message
        req.flash(
          'error',
          'Invalid reset token or reset token already expired. Please request another reset token'
        );

        //redirect back to request token page
        return res.redirect('/forgot-password');
      }

      //if valid, render page
      res.render('auth/reset', {
        path: '/login',
        pageTitle: 'Reset Password',
        validationErrors: [],
        formValues: { password: '', passwordConfirm: '' },
        resetToken: token,
        userId: user._id,
      });
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      return next(error);
    });
};

//handling reset password process
exports.postNewPassword = (req, res, next) => {
  const { password, resetToken, userId } = req.body;

  let fetchedUser;

  //check if token is valid
  User.findOne({
    resetToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then(user => {
      //if false
      if (!user) {
        //flash error message
        req.flash(
          'error',
          'Invalid reset token or reset token already expired. Please request another reset token'
        );

        //redirect back to request token page
        return res.redirect('/forgot-password');
      }

      fetchedUser = user;

      //if true, hash new password
      return bcrypt.hash(password, 12);
    })
    .then(hashedPassword => {
      //update the user in the database
      fetchedUser.password = hashedPassword;

      //reset the resetToken and resetTokenExpiration to null
      fetchedUser.resetToken = null;
      fetchedUser.resetTokenExpiration = null;

      //save to database
      return fetchedUser.save();
    })
    .then(user => {
      //flash success message
      req.flash('successMsg', 'Password updated successfully!');

      //redirect back to login page
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);

      error.httpStatusCode = 500;

      return next(error);
    });
};
