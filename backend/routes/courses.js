const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

const pdfDirectory = path.join(__dirname, '..', 'uploads', 'pdfs');
fs.mkdirSync(pdfDirectory, { recursive: true });
const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: pdfDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.pdf`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.pdf' || !['application/pdf', 'application/octet-stream'].includes(file.mimetype)) {
      return callback(new Error('Choose a PDF file'));
    }
    callback(null, true);
  }
});

const parsePdfUpload = (req, res, next) => {
  pdfUpload.single('pdf')(req, res, error => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: error.message });
    }
    next();
  });
};

const hasValidPdfLinks = (lessons = []) => lessons.every(({ notes }) => {
  if (!notes?.pdfUrl) return true;
  try {
    const url = new URL(notes.pdfUrl.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
});

async function notifyStudentsNewCourse(course) {
  const students = await User.find({ role: 'student' }).select('_id');
  const link = `/courses/${course._id}`;
  for (const student of students) {
    const exists = await Notification.findOne({ recipient: student._id, type: 'new_course', link });
    if (!exists) {
      await Notification.create({
        recipient: student._id,
        type: 'new_course',
        title: 'New Course Published',
        message: `A new course "${course.title}" is now available. Start learning today!`,
        link,
        icon: '📚',
        isRead: false
      });
    }
  }
}

// @GET /api/courses - Get all published courses
router.get('/', async (req, res) => {
  try {
    const { category, level, search, page = 1, limit = 12 } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const courses = await Course.find(query)
      .populate('instructor', 'name avatar')
      .select('-lessons.quiz')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    const total = await Course.countDocuments(query);
    res.json({ success: true, courses, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/courses/pdf - Upload a PDF for use as course material
router.post('/pdf', protect, authorize('instructor', 'admin'), parsePdfUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Select a PDF file to upload' });
  try {
    const fileHandle = await fs.promises.open(req.file.path, 'r');
    let isPdf;
    try {
      const signature = Buffer.alloc(5);
      const { bytesRead } = await fileHandle.read(signature, 0, signature.length, 0);
      isPdf = bytesRead === signature.length && signature.toString() === '%PDF-';
    } finally {
      await fileHandle.close();
    }
    if (!isPdf) {
      await fs.promises.unlink(req.file.path);
      return res.status(400).json({ success: false, message: 'The selected file is not a valid PDF' });
    }
    let extractedText = '';
    try {
      const parsed = await pdfParse(await fs.promises.readFile(req.file.path));
      extractedText = parsed.text.replace(/\u0000/g, '').trim().slice(0, 80000);
    } catch {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: 'The PDF could not be read. Please upload a valid PDF file.' });
    }
    const publicBaseUrl = (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.status(201).json({
      success: true,
      pdfUrl: `${publicBaseUrl}/uploads/pdfs/${req.file.filename}`,
      extractedText,
      originalName: req.file.originalname
    });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, message: 'Unable to save the PDF file' });
  }
});

// @GET /api/courses/my - Get instructor's own courses (published + drafts)
router.get('/my', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .populate('instructor', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/courses/:id - Get single course
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    const isOwner = course.instructor.toString() === req.user._id.toString();
    const isEnrolled = course.enrolledStudents.some(id => id.toString() === req.user._id.toString());
    if (!course.isPublished && !isOwner && !isEnrolled && req.user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    if (!isOwner && !isEnrolled && req.user.role !== 'admin') {
      course.lessons = course.lessons.map(lesson => ({
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        order: lesson.order
      }));
    }
    await course.populate('instructor', 'name avatar bio');
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/courses - Create course (instructor/admin)
router.post('/', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    if (!hasValidPdfLinks(req.body.lessons)) {
      return res.status(400).json({ success: false, message: 'Lesson PDF links must be valid HTTP(S) URLs' });
    }
    const course = await Course.create({ ...req.body, instructor: req.user._id });
    if (course.isPublished) {
      await notifyStudentsNewCourse(course);
    }
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/courses/:id - Update course
router.put('/:id', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.body.lessons && !hasValidPdfLinks(req.body.lessons)) {
      return res.status(400).json({ success: false, message: 'Lesson PDF links must be valid HTTP(S) URLs' });
    }
    const wasPublished = course.isPublished;
    const editableFields = ['title', 'description', 'category', 'level', 'thumbnail', 'price', 'isFree', 'lessons', 'isPublished', 'tags'];
    editableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) course[field] = req.body[field];
    });
    course = await course.save();
    if (!wasPublished && course.isPublished) {
      await notifyStudentsNewCourse(course);
    }
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/courses/:id/enroll - Enroll in course
router.post('/:id/enroll', protect, authorize('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!course.isPublished) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor && course.instructor._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot enroll in your own course' });
    }
    if (course.enrolledStudents.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }
    course.enrolledStudents.push(req.user._id);
    await course.save();
    await User.findByIdAndUpdate(req.user._id, { $push: { enrolledCourses: course._id } });
    await Progress.create({ student: req.user._id, course: course._id });

    // Notify student
    await Notification.create({
      recipient: req.user._id,
      type: 'enrollment',
      title: 'Enrollment Confirmed!',
      message: `You are now enrolled in "${course.title}". Start learning today!`,
      link: `/courses/${course._id}`,
      icon: '🎉'
    });
    // Notify instructor
    if (course.instructor) {
      await Notification.create({
        recipient: course.instructor._id,
        type: 'new_student',
        title: 'New Student Enrolled',
        message: `${req.user.name} just enrolled in your course "${course.title}".`,
        link: `/instructor`,
        icon: '👥'
      });
    }
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/courses/:id/students - Get student roster for a course (instructor)
router.get('/:id/students', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const progressList = await Progress.find({ course: req.params.id })
      .populate('student', 'name email avatar createdAt')
      .sort({ updatedAt: -1 });
    res.json({ success: true, students: progressList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/courses/:id/rate - Rate a course
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    const existingRating = course.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
    } else {
      course.ratings.push({ user: req.user._id, rating, review });
    }
    course.calculateAverageRating();
    await course.save();
    res.json({ success: true, averageRating: course.averageRating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/courses/:id - Delete course
router.delete('/:id', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
