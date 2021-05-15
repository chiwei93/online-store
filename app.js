const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const csrf = require('csurf');
const flash = require('connect-flash');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const shopRouter = require('./routes/shop');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const User = require('./models/user');
const upload = require('./util/upload');
const navCart = require('./middleware/navCart');

//config env file
dotenv.config();

//create app
const app = express();

const MONGODB_URI = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.j6emy.mongodb.net/${process.env.DEFAULT_DATABASE}?retryWrites=true&w=majority`;

//setting up session store
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});

const csrfProtection = csrf();

//setting view engine
app.set('view engine', 'ejs');

//using helmet
app.use(helmet({ contentSecurityPolicy: false }));

//using compression
app.use(compression());

//body parser
app.use(express.urlencoded({ extended: false }));

//indicate where the static files are
app.use(express.static(path.join(__dirname, 'public')));

//using session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

//using csrf middleware
app.use(csrfProtection);

//using flash middleware
app.use(flash());

app.use(cors());

//set the authenticated status and crsfToken on every responses
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

//middleware for setting user on the request object
app.use((req, res, next) => {
  //check if there is a session user object set
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
    .then(user => {
      //check if user exist
      if (!user) {
        return next();
      }

      //create a user property on the request object
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

//middleware for setting number of cart items in the navigation
app.use(navCart);

//using multer for uploading image to amazon s3
app.use(upload.single('image'));

//routes
app.use(shopRouter);
app.use(authRouter);
app.use('/admin', adminRouter);

//for catching 404 errors
app.use((req, res, next) => {
  res.render('errors/404', {
    path: '',
    pageTitle: 'Page Not Found',
  });
});

//error handling middleware
app.use((error, req, res, next) => {
  console.log(error);

  res.render('errors/500', {
    path: '',
    pageTitle: 'Internal Server Error',
  });
});

const port = process.env.PORT || 3000;

//connecting to db
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(result => {
    console.log('db connected');

    app.listen(port, () => {
      console.log(`app listening on port ${port}`);
    });
  })
  .catch(err => {
    console.log(err);
  });
