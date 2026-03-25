import express from 'express';
import path from 'path';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import { requestContext } from './middleware/requestContext.js';
import pageRoutes from './routes/pageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));
app.set('layout', 'layouts/main');

app.use(expressLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: env.mongoUri }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);
app.use(requestContext);
app.use(express.static(path.join(projectRoot, 'public')));

app.use('/', pageRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/items', itemRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('pages/not-found', {
    title: 'Page Not Found',
    pageCss: 'pages/not-found.css',
    pageJs: 'pages/not-found.js'
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      message: 'Something went wrong while processing the request.'
    });
  }

  return res.status(500).render('pages/not-found', {
    title: 'Server Error',
    pageCss: 'pages/not-found.css',
    pageJs: 'pages/not-found.js'
  });
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

startServer();
