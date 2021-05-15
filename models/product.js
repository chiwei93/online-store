const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  quantity: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: [
      'phone',
      'laptop',
      'game console',
      'desktop',
      'monitor',
      'accessories',
    ],
    required: true,
  },
  updatedAt: Date,
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
