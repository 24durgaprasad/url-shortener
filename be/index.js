require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const Url = require('./models/url');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI);

const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

const validateUrl = (req, res, next) => {
  const { originalUrl } = req.body;
  
  if (!originalUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  if (!validator.isURL(originalUrl, { protocols: ['http', 'https'], require_protocol: true })) {
    return res.status(400).json({ error: 'Please provide a valid URL with http:// or https://' });
  }
  
  const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
  const urlObj = new URL(originalUrl);
  if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
    return res.status(400).json({ error: 'Cannot shorten local URLs' });
  }
  
  next();
};

app.post('/api/shorten', validateUrl, async (req, res) => {
  const { originalUrl } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    let url = await Url.findOne({ originalUrl });
    if (url) {
      return res.json({
        success: true,
        data: {
          originalUrl: url.originalUrl,
          shortCode: url.shortCode,
          shortUrl: `${process.env.BASE}/${url.shortCode}`,
          clicks: url.clicks,
          createdAt: url.date
        }
      });
    }

    const { nanoid } = await import('nanoid');
    let shortCode;
    let isUnique = false;
    
    while (!isUnique) {
      shortCode = nanoid(7);
      const existingUrl = await Url.findOne({ shortCode });
      if (!existingUrl) isUnique = true;
    }

    url = new Url({
      originalUrl,
      shortCode,
      createdBy: clientIp
    });

    await url.save();
    
    res.status(201).json({
      success: true,
      data: {
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE}/${url.shortCode}`,
        clicks: url.clicks,
        createdAt: url.date
      }
    });
  } catch (err) {
    console.error('Error creating short URL:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error. Please try again.' 
    });
  }
});

app.get('/api/analytics/:shortcode', async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.shortcode });
    
    if (!url) {
      return res.status(404).json({ 
        success: false,
        error: 'Short URL not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        clicks: url.clicks,
        createdAt: url.date,
        lastAccessed: url.lastAccessed
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

app.get('/:shortcode', async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.shortcode });

    if (url) {
      url.clicks++;
      url.lastAccessed = new Date();
      await url.save();
      
      return res.redirect(301, url.originalUrl);
    } else {
      return res.status(404).json({ 
        success: false,
        error: 'Short URL not found' 
      });
    }
  } catch (err) {
    console.error('Error redirecting:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  const validAdminKey = process.env.ADMIN_KEY || 'admin123';
  if (!adminKey || adminKey !== validAdminKey) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized. Admin access required.' 
    });
  }
  
  next();
};

app.get('/api/admin/urls', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    const urls = await Url.find({ isActive: true })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUrls = await Url.countDocuments({ isActive: true });
    const totalPages = Math.ceil(totalUrls / limit);

    const totalClicks = await Url.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
    ]);

    res.json({
      success: true,
      data: {
        urls: urls.map(url => ({
          id: url._id,
          originalUrl: url.originalUrl,
          shortCode: url.shortCode,
          shortUrl: `${process.env.BASE}/${url.shortCode}`,
          clicks: url.clicks,
          createdAt: url.date,
          lastAccessed: url.lastAccessed,
          createdBy: url.createdBy,
          isActive: url.isActive
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalUrls,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          totalUrls,
          totalClicks: totalClicks[0]?.totalClicks || 0
        }
      }
    });
  } catch (err) {
    console.error('Error fetching admin URLs:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

app.delete('/api/admin/urls/:id', adminAuth, async (req, res) => {
  try {
    const url = await Url.findById(req.params.id);
    
    if (!url) {
      return res.status(404).json({ 
        success: false,
        error: 'URL not found' 
      });
    }

    url.isActive = false;
    await url.save();

    res.json({
      success: true,
      message: 'URL deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting URL:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const totalUrls = await Url.countDocuments({ isActive: true });
    const totalClicks = await Url.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
    ]);
    
    const topUrls = await Url.find({ isActive: true })
      .sort({ clicks: -1 })
      .limit(5)
      .lean();

    const recentUrls = await Url.find({ isActive: true })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const urlsToday = await Url.countDocuments({ 
      isActive: true,
      date: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        totalUrls,
        totalClicks: totalClicks[0]?.totalClicks || 0,
        urlsToday,
        topUrls: topUrls.map(url => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          clicks: url.clicks
        })),
        recentUrls: recentUrls.map(url => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          createdAt: url.date
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});