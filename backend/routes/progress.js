const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/progress/my - Get all my progress
router.get('/my', protect, authorize('student'), async (req, res) => {
  try {
    const progress = await Progress.find({ student: req.user._id })
      .populate('course', 'title thumbnail category totalDuration lessons')
      .sort({ updatedAt: -1 });
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/progress/:courseId - Get progress for a specific course
router.get('/:courseId', protect, authorize('student'), async (req, res) => {
  try {
    const progress = await Progress.findOne({ student: req.user._id, course: req.params.courseId });
    if (!progress) return res.status(404).json({ success: false, message: 'Progress not found' });
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/progress/:courseId/lesson/:lessonId - Mark lesson complete
router.put('/:courseId/lesson/:lessonId', protect, authorize('student'), async (req, res) => {
  try {
    const { timeSpent } = req.body;
    const progress = await Progress.findOne({ student: req.user._id, course: req.params.courseId });
    if (!progress) return res.status(404).json({ success: false, message: 'Progress record not found' });

    const alreadyCompleted = progress.completedLessons.find(
      l => l.lesson.toString() === req.params.lessonId
    );
    if (!alreadyCompleted) {
      progress.completedLessons.push({ lesson: req.params.lessonId, timeSpent: timeSpent || 0 });
    }

    // Update total time spent
    progress.totalTimeSpent += timeSpent || 0;
    progress.lastAccessedLesson = req.params.lessonId;
    progress.lastStudyDate = new Date();

    // Calculate overall progress
    const course = await Course.findById(req.params.courseId);
    if (course && course.lessons.length > 0) {
      progress.overallProgress = Math.round((progress.completedLessons.length / course.lessons.length) * 100);
    }

    // Mark course as completed
    if (progress.overallProgress === 100) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    // Activity log
    progress.activityLog.push({ minutesSpent: timeSpent || 0, action: 'watched' });

    // Update streak
    const today = new Date().toDateString();
    const lastStudy = progress.lastStudyDate ? new Date(progress.lastStudyDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastStudy === yesterday) progress.streak += 1;
    else if (lastStudy !== today) progress.streak = 1;

    await progress.save();
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/progress/:courseId/quiz/:lessonId - Submit quiz score
router.post('/:courseId/quiz/:lessonId', protect, authorize('student'), async (req, res) => {
  try {
    const { score, totalQuestions } = req.body;
    const progress = await Progress.findOne({ student: req.user._id, course: req.params.courseId });
    if (!progress) return res.status(404).json({ success: false, message: 'Progress not found' });

    progress.quizScores.push({ lesson: req.params.lessonId, score, totalQuestions });
    progress.activityLog.push({ minutesSpent: 5, action: 'quiz' });
    await progress.save();
    res.json({ success: true, message: 'Quiz score saved', progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
