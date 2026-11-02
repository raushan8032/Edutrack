const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const { protect } = require('../middleware/auth');

// @GET /api/bookmarks - Get all bookmarks for user
router.get('/', protect, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, bookmarks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/bookmarks - Add bookmark
router.post('/', protect, async (req, res) => {
  try {
    const { course, lesson, lessonTitle, courseTitle, type, note } = req.body;
    const existing = await Bookmark.findOne({ user: req.user._id, lesson });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already bookmarked' });
    }
    const bookmark = await Bookmark.create({
      user: req.user._id, course, lesson, lessonTitle, courseTitle, type, note
    });
    res.status(201).json({ success: true, bookmark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/bookmarks/:lessonId - Remove bookmark by lessonId
router.delete('/:lessonId', protect, async (req, res) => {
  try {
    await Bookmark.findOneAndDelete({ user: req.user._id, lesson: req.params.lessonId });
    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
