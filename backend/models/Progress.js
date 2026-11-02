const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLessons: [{
    lesson: mongoose.Schema.Types.ObjectId,
    completedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 } // minutes
  }],
  quizScores: [{
    lesson: mongoose.Schema.Types.ObjectId,
    score: Number,
    totalQuestions: Number,
    attemptedAt: { type: Date, default: Date.now }
  }],
  overallProgress: { type: Number, default: 0 }, // percentage 0-100
  lastAccessedLesson: { type: mongoose.Schema.Types.ObjectId },
  totalTimeSpent: { type: Number, default: 0 }, // total minutes on course
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  isCompleted: { type: Boolean, default: false },
  streak: { type: Number, default: 0 }, // daily learning streak
  lastStudyDate: { type: Date },
  activityLog: [{
    date: { type: Date, default: Date.now },
    minutesSpent: Number,
    action: { type: String, enum: ['watched', 'quiz', 'review'] }
  }]
}, { timestamps: true });

// Ensure one progress record per student per course
progressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
