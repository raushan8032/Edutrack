const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lesson: { type: String, required: true },   // lesson._id (string)
  lessonTitle: { type: String, default: '' },
  courseTitle: { type: String, default: '' },
  type: { type: String, enum: ['video', 'notes', 'lesson'], default: 'lesson' },
  note: { type: String, default: '' }         // personal note by student
}, { timestamps: true });

// Unique per user+lesson
bookmarkSchema.index({ user: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
