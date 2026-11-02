const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String },
  duration: { type: Number, default: 0 }, // in minutes
  order: { type: Number, required: true },
  resources: [{ name: String, url: String }],
  // Chapter-wise notes
  notes: {
    textContent: { type: String, default: '' },    // Rich text / markdown notes
    pdfUrl: { type: String, default: '' },         // Optional PDF link
    pdfText: { type: String, default: '' },        // Extracted text used for course-grounded answers
    summary: { type: String, default: '' }         // Short AI-generated or instructor summary
  },
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number
  }]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: 100
  },
  description: { type: String, required: true },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['Web Development', 'Data Science', 'Machine Learning', 'Mobile Dev', 'DevOps', 'Design', 'Business', 'Other'],
    required: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  thumbnail: { type: String, default: '' },
  price: { type: Number, default: 0 },
  isFree: { type: Boolean, default: true },
  lessons: [lessonSchema],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    date: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // total minutes
  isPublished: { type: Boolean, default: false },
  tags: [String]
}, { timestamps: true });

// Calculate average rating
courseSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) { this.averageRating = 0; return; }
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
};

module.exports = mongoose.model('Course', courseSchema);
