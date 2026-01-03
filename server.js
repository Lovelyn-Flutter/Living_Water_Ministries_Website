require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'livingwater-blog',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 800, crop: 'limit' }]
    }
});

const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livingwater';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
    secret: process.env.SESSION_SECRET || 'living-water-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax' 
    }
}));


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', categorySchema);

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    excerpt: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    featuredImage: String,
    author: String,
    published: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: String,
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

const isAuthenticated = (req, res, next) => {
    console.log('Auth check - Session:', req.session);
    console.log('User ID in session:', req.session?.userId);
    
    if (req.session && req.session.userId) {
        next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        res.redirect('/login');
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/post/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

app.get('/category/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'category.html'));
});

// Initialize admin user
app.post('/api/init-admin', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: 'admin' });
        if (existingUser) {
            return res.status(400).json({ message: 'Admin already exists' });
        }
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        const admin = new User({ username: 'admin', password: hashedPassword });
        await admin.save();
        res.json({ message: 'Admin user created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset admin password
app.post('/api/reset-admin-password', async (req, res) => {
    try {
        const newPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const user = await User.findOneAndUpdate(
            { username: 'admin' },
            { password: hashedPassword },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ message: 'Admin user not found' });
        }
        
        res.json({ 
            message: 'Admin password reset successfully',
            note: 'You can now login with the password from your .env file'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        req.session.userId = user._id;
        req.session.username = user.username;
 
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session error' });
            }
            
            console.log('Login successful, session saved:', req.session);
            res.json({ 
                message: 'Login successful', 
                username: user.username,
                sessionId: req.sessionID 
            });
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});


app.get('/api/check-auth', (req, res) => {
    console.log('Check auth - Session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('User ID:', req.session?.userId);
    
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/categories/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const category = new Category({ name, slug, description });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        const updateData = { name, description };
        if (name) {
            updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        }
        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.get('/api/posts', async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const query = { published: true };
        
        if (category) {
            const cat = await Category.findOne({ slug: category });
            if (cat) query.category = cat._id;
        }
        
        const posts = await Post.find(query)
            .populate('category')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await Post.countDocuments(query);
        
        res.json({
            posts,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/posts/slug/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).populate('category');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/posts', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find().populate('category').sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/posts/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('category');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.post('/api/posts', isAuthenticated, upload.single('featuredImage'), async (req, res) => {
    try {
        const { title, content, excerpt, category, author } = req.body;
        const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        
        const post = new Post({
            title, slug, content, excerpt, category,
            author: author || 'Admin',
            featuredImage: req.file ? req.file.path : null
        });
        
        await post.save();
        const populatedPost = await Post.findById(post._id).populate('category');
        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


app.put('/api/posts/:id', isAuthenticated, upload.single('featuredImage'), async (req, res) => {
    try {
        const { title, content, excerpt, category, author, published } = req.body;
        const updateData = { title, content, excerpt, category, author, published, updatedAt: Date.now() };
        
        if (req.file) {
            updateData.featuredImage = req.file.path;
        }
        
        const post = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');
        res.json(post);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/posts/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (post && post.featuredImage) {
            const publicId = post.featuredImage.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`livingwater-blog/${publicId}`);
        }
        
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const contact = new Contact({ name, email, subject, message });
        await contact.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/contact', isAuthenticated, async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/seed', async (req, res) => {
    try {
        const categories = [
            { name: 'Faith', slug: 'faith', description: 'Articles about faith and belief' },
            { name: 'Prayer', slug: 'prayer', description: 'Insights on prayer and communion with God' },
            { name: 'Soul Winning', slug: 'soul-winning', description: 'Evangelism and reaching the lost' }
        ];
        
        for (let cat of categories) {
            const exists = await Category.findOne({ slug: cat.slug });
            if (!exists) {
                await Category.create(cat);
            }
        }
        
        res.json({ message: 'Database seeded successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});