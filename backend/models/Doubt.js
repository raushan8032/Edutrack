const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'pdf', 'video', 'link', 'other'], default: 'other' },
  size: { type: Number }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['student', 'instructor', 'admin'], required: true },
  text: { type: String, required: true, trim: true, maxlength: 5000 },
  attachments: [attachmentSchema],
  isEdited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const doubtSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, required: true },
  // Store lesson title at creation time to avoid lookup errors
  lessonTitle: { type: String, default: '' },
  topic: { type: String, default: '', maxlength: 200 },
  status: { type: String, enum: ['pending', 'in_progress', 'answered', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  messages: { type: [messageSchema], validate: entries => entries.length > 0 },
  // Instructor rating for this doubt session
  studentRating: { type: Number, min: 1, max: 5 },
  studentFeedback: { type: String, maxlength: 500 },
  // Instructor notes (internal)
  instructorNotes: { type: String, default: '', maxlength: 2000 },
  // Reference materials shared by instructor
  references: [{ title: String, url: String, type: { type: String, default: 'link' } }],
  tags: [String],
  viewedByInstructor: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: true });

doubtSchema.index({ course: 1, status: 1, updatedAt: -1 });
doubtSchema.index({ student: 1, updatedAt: -1 });
doubtSchema.index({ course: 1, lesson: 1 });

module.exports = mongoose.model('Doubt', doubtSchema);