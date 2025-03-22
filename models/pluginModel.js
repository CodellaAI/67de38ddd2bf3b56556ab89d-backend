
const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const versionSchema = mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
    },
    changelog: {
      type: String,
    },
    jarFile: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const purchaseSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    price: {
      type: Number,
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const pluginSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: 0,
    },
    version: {
      type: String,
      required: [true, 'Please add a version'],
    },
    category: {
      type: String,
      enum: ['Utility', 'Economy', 'Admin Tools', 'Fun', 'Game Mechanics', 'Anti-Grief', 'Other'],
      default: 'Other',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    jarFile: {
      type: String,
      required: [true, 'Please upload a JAR file'],
    },
    thumbnail: {
      type: String,
    },
    ratings: [ratingSchema],
    versions: [versionSchema],
    purchases: [purchaseSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate average rating before saving
pluginSchema.pre('save', function(next) {
  if (this.ratings.length > 0) {
    this.averageRating = this.ratings.reduce((acc, rating) => acc + rating.rating, 0) / this.ratings.length;
  } else {
    this.averageRating = 0;
  }
  next();
});

module.exports = mongoose.model('Plugin', pluginSchema);
