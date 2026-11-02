const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/analytics/student - Student's own analytics
router.get('/student', protect, authorize('student'), async (req, res) => {
  try {
    const allProgress = await Progress.find({ student: req.user._id })
      .populate('course', 'title category totalDuration lessons thumbnail')
      .sort({ updatedAt: -1 });

    const totalCourses = allProgress.length;
    const completedCourses = allProgress.filter(p => p.isCompleted).length;
    const coursesInProgress = allProgress.filter(p => !p.isCompleted && p.overallProgress > 0).length;
    const totalTimeSpent = allProgress.reduce((sum, p) => sum + (p.totalTimeSpent || 0), 0);
    const avgProgress = totalCourses > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.overallProgress, 0) / totalCourses)
      : 0;

    // Weekly activity - last 7 days
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toDateString();
      let minutes = 0;
      allProgress.forEach(p => {
        p.activityLog.forEach(log => {
          if (new Date(log.date).toDateString() === dayStr) {
            minutes += log.minutesSpent || 0;
          }
        });
      });
      weeklyActivity.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        minutes
      });
    }

    // Category breakdown
    const categoryMap = {};
    allProgress.forEach(p => {
      if (p.course && p.course.category) {
        const cat = p.course.category;
        if (!categoryMap[cat]) categoryMap[cat] = { count: 0, timeSpent: 0 };
        categoryMap[cat].count++;
        categoryMap[cat].timeSpent += p.totalTimeSpent || 0;
      }
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({ name, ...data }));

    // Quiz performance
    const allQuizScores = [];
    allProgress.forEach(p => p.quizScores.forEach(q => allQuizScores.push(q)));
    const avgQuizScore = allQuizScores.length > 0
      ? Math.round(allQuizScores.reduce((sum, q) => sum + (q.score / q.totalQuestions) * 100, 0) / allQuizScores.length)
      : 0;

    // Current streak
    const maxStreak = allProgress.reduce((max, p) => Math.max(max, p.streak || 0), 0);

    const learningHistory = allProgress.flatMap(progress => (progress.activityLog || []).map(activity => ({
      courseTitle: progress.course?.title || 'Course',
      date: activity.date,
      minutes: activity.minutesSpent || 0,
      action: activity.action
    }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    // Monthly progress - last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      let completions = 0;
      allProgress.forEach(p => {
        if (p.completedAt && p.completedAt >= monthStart && p.completedAt <= monthEnd) completions++;
      });
      monthlyData.push({ month, completions });
    }

    res.json({
      success: true,
      analytics: {
        totalCourses, completedCourses, coursesInProgress, totalTimeSpent,
        avgProgress, avgQuizScore, maxStreak,
        weeklyActivity, categoryBreakdown, monthlyData,
        recentProgress: allProgress.slice(0, 5), learningHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/analytics/instructor - Instructor analytics
router.get('/instructor', protect, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id }).sort({ createdAt: -1 });
    const courseIds = courses.map(c => c._id);
    const allProgress = await Progress.find({ course: { $in: courseIds } })
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ updatedAt: -1 });

    const totalStudents = new Set(courses.flatMap(course => course.enrolledStudents.map(id => id.toString()))).size;
    const totalEnrollments = courses.reduce((sum, course) => sum + course.enrolledStudents.length, 0);
    const completionRate = totalEnrollments > 0
      ? Math.round((allProgress.filter(p => p.isCompleted).length / totalEnrollments) * 100)
      : 0;
    const quizScores = allProgress.flatMap(progress => progress.quizScores || []);
    const averageQuizScore = quizScores.length
      ? Math.round(quizScores.reduce((sum, quiz) => sum + (quiz.totalQuestions ? quiz.score / quiz.totalQuestions * 100 : 0), 0) / quizScores.length)
      : 0;

    const courseStats = courses.map(course => {
      const courseProgress = allProgress.filter(p => p.course?._id.toString() === course._id.toString());
      const avgProgress = courseProgress.length > 0
        ? Math.round(courseProgress.reduce((sum, p) => sum + p.overallProgress, 0) / courseProgress.length)
        : 0;
      const courseQuizScores = courseProgress.flatMap(progress => progress.quizScores || []);
      const courseQuizScore = courseQuizScores.length
        ? Math.round(courseQuizScores.reduce((sum, quiz) => sum + (quiz.totalQuestions ? quiz.score / quiz.totalQuestions * 100 : 0), 0) / courseQuizScores.length)
        : 0;
      return {
        courseId: course._id,
        title: course.title,
        isPublished: course.isPublished,
        enrollments: course.enrolledStudents.length,
        avgProgress,
        completions: courseProgress.filter(p => p.isCompleted).length,
        completionRate: course.enrolledStudents.length
          ? Math.round(courseProgress.filter(p => p.isCompleted).length / course.enrolledStudents.length * 100)
          : 0,
        averageQuizScore: courseQuizScore,
        averageTimeSpent: courseProgress.length
          ? Math.round(courseProgress.reduce((sum, p) => sum + (p.totalTimeSpent || 0), 0) / courseProgress.length)
          : 0,
        rating: course.averageRating
      };
    });

    const recentEnrollments = [...allProgress]
      .filter(progress => progress.student && progress.course)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(progress => ({
        studentName: progress.student.name,
        courseTitle: progress.course.title,
        enrolledAt: progress.createdAt
      }));

    const studentActivity = allProgress.flatMap(progress => (progress.activityLog || []).map(activity => ({
      studentName: progress.student?.name || 'Student',
      courseTitle: progress.course?.title || 'Course',
      action: activity.action,
      minutes: activity.minutesSpent || 0,
      date: activity.date
    }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    const enrollmentTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      enrollmentTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        enrollments: allProgress.filter(progress => progress.createdAt >= monthStart && progress.createdAt < monthEnd).length
      });
    }

    const recentNotifications = await Notification.find({ recipient: req.user._id, type: 'new_student' })
      .sort({ createdAt: -1 }).limit(6);

    res.json({
      success: true,
      analytics: {
        totalStudents,
        totalEnrollments,
        totalCourses: courses.length,
        publishedCourses: courses.filter(course => course.isPublished).length,
        draftCourses: courses.filter(course => !course.isPublished).length,
        completionRate,
        averageQuizScore,
        courseStats,
        popularCourses: [...courseStats].sort((a, b) => b.enrollments - a.enrollments).slice(0, 5),
        recentEnrollments,
        studentActivity,
        enrollmentTrends,
        recentNotifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/analytics/admin - Admin platform analytics
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalProgress] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Progress.countDocuments()
    ]);
    const students = await User.countDocuments({ role: 'student' });
    const instructors = await User.countDocuments({ role: 'instructor' });
    const completedCourses = await Progress.countDocuments({ isCompleted: true });

    res.json({
      success: true,
      analytics: { totalUsers, totalCourses, totalProgress, students, instructors, completedCourses }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
