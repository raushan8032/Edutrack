const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');
const Progress = require('./models/Progress');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Course.deleteMany({});
  await Progress.deleteMany({});
  console.log('Cleared existing data');

  // Create users
  const adminPass = await bcrypt.hash('admin1234', 12);
  const demoPass = await bcrypt.hash('demo1234', 12);

  const admin = await User.create({ name: 'Admin User', email: 'admin@demo.com', password: adminPass, role: 'admin' });
  const instructor = await User.create({ name: 'Dr. Sarah Johnson', email: 'instructor@demo.com', password: demoPass, role: 'instructor', bio: 'Senior developer with 10 years of teaching experience.' });
  const instructor2 = await User.create({ name: 'Prof. Mike Chen', email: 'mike@demo.com', password: demoPass, role: 'instructor', bio: 'Data scientist and ML researcher.' });
  const student = await User.create({ name: 'Alex Student', email: 'student@demo.com', password: demoPass, role: 'student' });

  console.log('Users created');

  // Create courses
  const webCourse = await Course.create({
    title: 'Complete React & Node.js Full Stack Bootcamp',
    description: 'Master modern full-stack web development with React, Node.js, Express, and MongoDB. Build real-world projects from scratch with industry best practices.',
    instructor: instructor._id,
    category: 'Web Development',
    level: 'Intermediate',
    isFree: true,
    isPublished: true,
    totalDuration: 480,
    tags: ['React', 'Node', 'MongoDB', 'Express'],
    lessons: [
      { title: 'Introduction to Full Stack Development', description: 'Overview of modern full-stack architecture and tools.', duration: 20, order: 1, videoUrl: '', quiz: [{ question: 'What does MERN stand for?', options: ['MongoDB Express React Node', 'MySQL Express React Node', 'MongoDB Express Ruby Node', 'MySQL Express Ruby Node'], correctAnswer: 0 }] },
      { title: 'Setting Up Your Development Environment', description: 'Install Node.js, VS Code, MongoDB and configure your workspace.', duration: 25, order: 2, quiz: [{ question: 'Which tool is used to run JavaScript outside the browser?', options: ['Python', 'Node.js', 'Java', 'PHP'], correctAnswer: 1 }] },
      { title: 'React Fundamentals — JSX & Components', description: 'Learn JSX syntax, functional components, and component composition.', duration: 45, order: 3, quiz: [] },
      { title: 'React Hooks — useState & useEffect', description: 'Master the two most essential React Hooks for state and side effects.', duration: 50, order: 4, quiz: [{ question: 'Which hook manages local component state?', options: ['useEffect', 'useContext', 'useState', 'useRef'], correctAnswer: 2 }] },
      { title: 'Building REST APIs with Express', description: 'Create robust RESTful APIs using Express.js middleware and routing.', duration: 55, order: 5, quiz: [] },
      { title: 'MongoDB & Mongoose ODM', description: 'Database design, schemas, models, and CRUD operations with Mongoose.', duration: 50, order: 6, quiz: [] },
    ]
  });

  const mlCourse = await Course.create({
    title: 'Machine Learning A-Z with Python',
    description: 'Hands-on machine learning from linear regression to neural networks. Build real ML models and deploy them to production.',
    instructor: instructor2._id,
    category: 'Machine Learning',
    level: 'Beginner',
    isFree: true,
    isPublished: true,
    totalDuration: 360,
    tags: ['Python', 'ML', 'TensorFlow', 'Scikit-learn'],
    lessons: [
      { title: 'Introduction to Machine Learning', description: 'Types of ML, supervised vs unsupervised learning, real-world applications.', duration: 30, order: 1, quiz: [{ question: 'Which ML type uses labeled data?', options: ['Unsupervised', 'Reinforcement', 'Supervised', 'Semi-supervised'], correctAnswer: 2 }] },
      { title: 'Python for Data Science', description: 'NumPy, Pandas, Matplotlib — the core data science stack.', duration: 45, order: 2, quiz: [] },
      { title: 'Linear Regression Deep Dive', description: 'Understand gradient descent, cost functions, and implement from scratch.', duration: 55, order: 3, quiz: [] },
      { title: 'Classification Algorithms', description: 'Logistic Regression, KNN, Decision Trees, and Random Forests.', duration: 60, order: 4, quiz: [] },
    ]
  });

  const dsCourse = await Course.create({
    title: 'Data Science & Analytics with Python',
    description: 'From raw data to insights. Master pandas, visualization, statistical analysis, and build dashboards.',
    instructor: instructor2._id,
    category: 'Data Science',
    level: 'Beginner',
    isFree: false,
    price: 49,
    isPublished: true,
    totalDuration: 300,
    lessons: [
      { title: 'Data Analysis with Pandas', description: 'DataFrames, series, filtering, groupby, and merging datasets.', duration: 50, order: 1, quiz: [] },
      { title: 'Data Visualization with Matplotlib & Seaborn', description: 'Create compelling charts and dashboards to communicate insights.', duration: 45, order: 2, quiz: [] },
      { title: 'Statistical Analysis Fundamentals', description: 'Hypothesis testing, correlations, distributions, and p-values.', duration: 55, order: 3, quiz: [] },
    ]
  });

  const devopsCourse = await Course.create({
    title: 'DevOps & Cloud Deployment Masterclass',
    description: 'Learn Docker, Kubernetes, CI/CD pipelines, AWS deployment, and modern infrastructure management.',
    instructor: instructor._id,
    category: 'DevOps',
    level: 'Advanced',
    isFree: false,
    price: 79,
    isPublished: true,
    totalDuration: 420,
    lessons: [
      { title: 'Docker Containers from Zero', description: 'Containerization concepts, Dockerfile, docker-compose, and registries.', duration: 60, order: 1, quiz: [] },
      { title: 'Kubernetes Orchestration', description: 'Pods, services, deployments, and scaling in production.', duration: 75, order: 2, quiz: [] },
      { title: 'CI/CD with GitHub Actions', description: 'Automated testing, building, and deployment pipelines.', duration: 55, order: 3, quiz: [] },
    ]
  });

  console.log('Courses created');

  // Enroll student in courses
  webCourse.enrolledStudents.push(student._id);
  mlCourse.enrolledStudents.push(student._id);
  await webCourse.save();
  await mlCourse.save();

  await User.findByIdAndUpdate(student._id, {
    $push: { enrolledCourses: { $each: [webCourse._id, mlCourse._id] } }
  });

  // Create progress
  const prog1 = await Progress.create({
    student: student._id,
    course: webCourse._id,
    completedLessons: [
      { lesson: webCourse.lessons[0]._id, timeSpent: 22 },
      { lesson: webCourse.lessons[1]._id, timeSpent: 28 },
      { lesson: webCourse.lessons[2]._id, timeSpent: 48 },
    ],
    overallProgress: 50,
    totalTimeSpent: 98,
    streak: 3,
    lastStudyDate: new Date(),
    activityLog: [
      { date: new Date(Date.now() - 6 * 86400000), minutesSpent: 45, action: 'watched' },
      { date: new Date(Date.now() - 5 * 86400000), minutesSpent: 60, action: 'watched' },
      { date: new Date(Date.now() - 3 * 86400000), minutesSpent: 55, action: 'watched' },
      { date: new Date(Date.now() - 2 * 86400000), minutesSpent: 30, action: 'quiz' },
      { date: new Date(Date.now() - 1 * 86400000), minutesSpent: 70, action: 'watched' },
      { date: new Date(), minutesSpent: 40, action: 'watched' },
    ],
    quizScores: [
      { lesson: webCourse.lessons[0]._id, score: 1, totalQuestions: 1 },
      { lesson: webCourse.lessons[1]._id, score: 1, totalQuestions: 1 },
    ]
  });

  const prog2 = await Progress.create({
    student: student._id,
    course: mlCourse._id,
    completedLessons: [
      { lesson: mlCourse.lessons[0]._id, timeSpent: 32 },
    ],
    overallProgress: 25,
    totalTimeSpent: 32,
    streak: 1,
    lastStudyDate: new Date(),
    activityLog: [
      { date: new Date(Date.now() - 2 * 86400000), minutesSpent: 32, action: 'watched' },
    ],
    quizScores: [{ lesson: mlCourse.lessons[0]._id, score: 1, totalQuestions: 1 }]
  });

  console.log('Progress records created');
  console.log('\n✅ Seed complete! Demo accounts:');
  console.log('  Student:    student@demo.com    / demo1234');
  console.log('  Instructor: instructor@demo.com / demo1234');
  console.log('  Admin:      admin@demo.com      / admin1234');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
