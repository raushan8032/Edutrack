const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Doubt = require('../models/Doubt');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// Safely serialize a doubt document
const serializeDoubt = doubt => {
  const result = doubt.toObject ? doubt.toObject() : { ...doubt };
  // Ensure lessonTitle is always available (stored at creation or derived)
  if (!result.lessonTitle) {
    result.lessonTitle = 'Lesson';
  }
  return result;
};

const canManageCourse = (course, user) =>
  user.role === 'admin' || (course.instructor && course.instructor.toString() === user._id.toString());

// Published course metadata for the student doubt form. Do not expose lesson materials here.
router.get('/courses', protect, authorize('student'), async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select('title instructor lessons._id lessons.title')
      .populate('instructor', 'name')
      .sort({ title: 1 });
    res.json({
      success: true,
      courses: courses.map(course => ({
        _id: course._id,
        title: course.title,
        instructor: course.instructor,
        lessons: course.lessons.map(lesson => ({ _id: lesson._id, title: lesson.title }))
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/doubts — Student creates new doubt ───────────────────────────
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId, lessonId, text, topic, attachments, priority } = req.body;
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!courseId || !lessonId || !cleanText) {
      return res.status(400).json({ success: false, message: 'Course, lesson, and question are required' });
    }
    if (cleanText.length > 5000) {
      return res.status(400).json({ success: false, message: 'Question must be 5000 characters or fewer' });
    }

    const course = await Course.findById(courseId).populate('instructor', 'name');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!course.isPublished) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const lessonDoc = course.lessons.id(lessonId);
    if (!lessonDoc) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Validate attachments
    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(a => a && typeof a.name === 'string' && typeof a.url === 'string').slice(0, 5)
      : [];

    const doubt = await Doubt.create({
      student: req.user._id,
      course: course._id,
      lesson: lessonId,
      lessonTitle: lessonDoc.title || 'Lesson',
      topic: typeof topic === 'string' ? topic.trim().slice(0, 200) : '',
      priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
      messages: [{
        sender: req.user._id,
        senderRole: 'student',
        text: cleanText,
        attachments: validAttachments
      }]
    });

    // Notify instructor
    await Notification.create({
      recipient: course.instructor._id || course.instructor,
      type: 'new_doubt',
      title: 'New student question',
      message: `${req.user.name} asked a question about "${lessonDoc.title}" in "${course.title}".`,
      link: '/doubts',
      icon: '💬'
    });

    const populated = await Doubt.findById(doubt._id)
      .populate('student', 'name email avatar')
      .populate('course', 'title instructor')
      .populate('messages.sender', 'name role avatar');

    res.status(201).json({ success: true, doubt: serializeDoubt(populated) });
  } catch (error) {
    console.error('POST /api/doubts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/doubts/mine — Student gets their doubts ───────────────────────
router.get('/mine', protect, authorize('student'), async (req, res) => {
  try {
    const doubts = await Doubt.find({ student: req.user._id })
      .populate('course', 'title thumbnail instructor')
      .populate('messages.sender', 'name role avatar')
      .sort({ updatedAt: -1 });
    res.json({ success: true, doubts: doubts.map(serializeDoubt) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/doubts/instructor — Instructor gets all course doubts ──────────
router.get('/instructor', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const courseFilter = req.user.role === 'admin' ? {} : { instructor: req.user._id };
    const courses = await Course.find(courseFilter).select('_id');
    const doubts = await Doubt.find({ course: { $in: courses.map(c => c._id) } })
      .populate('student', 'name email avatar')
      .populate('course', 'title thumbnail instructor')
      .populate('messages.sender', 'name role avatar')
      .sort({ updatedAt: -1 });

    // Mark as viewed
    await Doubt.updateMany(
      { course: { $in: courses.map(c => c._id) }, viewedByInstructor: false },
      { viewedByInstructor: true }
    );

    res.json({ success: true, doubts: doubts.map(serializeDoubt) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/doubts/stats — Instructor gets summary stats ──────────────────
router.get('/stats', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const courseFilter = req.user.role === 'admin' ? {} : { instructor: req.user._id };
    const courses = await Course.find(courseFilter).select('_id');
    const courseIds = courses.map(c => c._id);

    const [total, pending, answered, resolved, unread] = await Promise.all([
      Doubt.countDocuments({ course: { $in: courseIds } }),
      Doubt.countDocuments({ course: { $in: courseIds }, status: 'pending' }),
      Doubt.countDocuments({ course: { $in: courseIds }, status: 'answered' }),
      Doubt.countDocuments({ course: { $in: courseIds }, status: 'resolved' }),
      Doubt.countDocuments({ course: { $in: courseIds }, viewedByInstructor: false })
    ]);

    res.json({ success: true, stats: { total, pending, answered, resolved, unread } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/doubts/:id — Get single doubt ─────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id)
      .populate('student', 'name email avatar')
      .populate('course', 'title thumbnail instructor')
      .populate('messages.sender', 'name role avatar');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });

    const isStudent = doubt.student._id.toString() === req.user._id.toString();
    const isInstructor = ['instructor', 'admin'].includes(req.user.role) &&
      canManageCourse(doubt.course, req.user);

    if (!isStudent && !isInstructor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, doubt: serializeDoubt(doubt) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/doubts/:id/messages — Add reply ──────────────────────────────
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { text, attachments } = req.body;
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return res.status(400).json({ success: false, message: 'Message text is required' });
    if (cleanText.length > 5000) return res.status(400).json({ success: false, message: 'Message must be 5000 characters or fewer' });

    const doubt = await Doubt.findById(req.params.id).populate('course', 'title instructor');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });

    const isStudent = req.user.role === 'student' && doubt.student.toString() === req.user._id.toString();
    const isInstructor = ['instructor', 'admin'].includes(req.user.role) && canManageCourse(doubt.course, req.user);

    if (!isStudent && !isInstructor) {
      return res.status(403).json({ success: false, message: 'Not authorized for this doubt' });
    }
    if (doubt.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'This doubt has been resolved' });
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(a => a && typeof a.name === 'string' && typeof a.url === 'string').slice(0, 5)
      : [];

    doubt.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      text: cleanText,
      attachments: validAttachments
    });

    // Update status
    if (isInstructor && doubt.status === 'pending') doubt.status = 'in_progress';
    else if (isInstructor) doubt.status = 'answered';
    else if (isStudent && doubt.status === 'answered') doubt.status = 'in_progress';

    await doubt.save();

    // Notifications
    if (isInstructor) {
      await Notification.create({
        recipient: doubt.student,
        type: 'doubt_reply',
        title: 'Your instructor replied',
        message: `Your instructor replied to your question in "${doubt.course.title}".`,
        link: '/doubts',
        icon: '💬'
      });
    } else {
      await Notification.create({
        recipient: doubt.course.instructor,
        type: 'new_doubt',
        title: 'Student follow-up',
        message: `${req.user.name} added a follow-up message in "${doubt.course.title}".`,
        link: '/doubts',
        icon: '💬'
      });
    }

    const updated = await Doubt.findById(doubt._id)
      .populate('student', 'name email avatar')
      .populate('course', 'title thumbnail instructor')
      .populate('messages.sender', 'name role avatar');

    res.json({ success: true, doubt: serializeDoubt(updated) });
  } catch (error) {
    console.error('POST /api/doubts/:id/messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/doubts/:id/status — Update status (instructor) ──────────────
router.patch('/:id/status', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in_progress', 'answered', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const doubt = await Doubt.findById(req.params.id).populate('course', 'title instructor');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
    if (!canManageCourse(doubt.course, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    doubt.status = status;
    if (status === 'resolved') doubt.resolvedAt = new Date();
    await doubt.save();

    await Notification.create({
      recipient: doubt.student,
      type: 'doubt_status',
      title: 'Doubt status updated',
      message: `Your instructor marked your question as "${status}" in "${doubt.course.title}".`,
      link: '/doubts',
      icon: '🔔'
    });

    res.json({ success: true, doubt: { _id: doubt._id, status: doubt.status, resolvedAt: doubt.resolvedAt } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/doubts/:id/priority — Update priority (instructor) ──────────
router.patch('/:id/priority', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority' });
    }

    const doubt = await Doubt.findById(req.params.id).populate('course', 'title instructor');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
    if (!canManageCourse(doubt.course, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    doubt.priority = priority;
    await doubt.save();
    res.json({ success: true, doubt: { _id: doubt._id, priority: doubt.priority } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/doubts/:id/notes — Instructor saves internal notes ───────────
router.patch('/:id/notes', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { instructorNotes } = req.body;
    const doubt = await Doubt.findById(req.params.id).populate('course', 'title instructor');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
    if (!canManageCourse(doubt.course, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    doubt.instructorNotes = typeof instructorNotes === 'string' ? instructorNotes.slice(0, 2000) : '';
    await doubt.save();
    res.json({ success: true, message: 'Notes saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/doubts/:id/references — Instructor adds reference material ────
router.post('/:id/references', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { title, url, type } = req.body;
    if (!title || !url) return res.status(400).json({ success: false, message: 'Title and URL are required' });

    const doubt = await Doubt.findById(req.params.id).populate('course', 'title instructor');
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
    if (!canManageCourse(doubt.course, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    doubt.references.push({ title: title.slice(0, 200), url, type: type || 'link' });
    await doubt.save();

    // Notify student
    await Notification.create({
      recipient: doubt.student,
      type: 'doubt_reply',
      title: 'Your instructor added a reference',
      message: `Your instructor shared a reference material for your question in "${doubt.course.title}".`,
      link: '/doubts',
      icon: '📚'
    });

    res.json({ success: true, references: doubt.references });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/doubts/:id/rate — Student rates the session ──────────────────
router.post('/:id/rate', protect, authorize('student'), async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
    if (doubt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the student can rate this session' });
    }
    if (doubt.status !== 'resolved') {
      return res.status(400).json({ success: false, message: 'You can only rate resolved doubts' });
    }

    doubt.studentRating = rating;
    doubt.studentFeedback = typeof feedback === 'string' ? feedback.slice(0, 500) : '';
    await doubt.save();

    res.json({ success: true, message: 'Rating submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;