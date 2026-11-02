const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['enrollment', 'course_published', 'new_course', 'lesson_complete', 'quiz_passed', 'achievement', 'announcement', 'new_student', 'doubt_reply', 'new_doubt', 'doubt_status'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  icon: { type: String, default: '🔔' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
