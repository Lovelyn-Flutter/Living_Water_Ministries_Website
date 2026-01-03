const API_URL = '/api';


const setAuthenticated = (value) => localStorage.setItem('authenticated', value);
const isAuthenticated = () => localStorage.getItem('authenticated') === 'true';
const removeAuthenticated = () => localStorage.removeItem('authenticated');


async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid credentials');
        }
        

        setAuthenticated('true');
        

        console.log('Login successful, redirecting to admin...');
        window.location.href = '/admin';
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/logout`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        removeAuthenticated();
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        removeAuthenticated();
        window.location.href = '/login';
    }
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/check-auth`, { 
            credentials: 'include' 
        });
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}


async function fetchCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        displayCategories(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

async function fetchAdminCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`, { credentials: 'include' });
        const categories = await response.json();
        displayAdminCategories(categories);
    } catch (error) {
        console.error('Error fetching admin categories:', error);
    }
}

async function createCategory(formData) {
    try {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to create category');
        alert('Category created successfully!');
        document.getElementById('categoryForm').reset();
        fetchAdminCategories();
        loadCategoriesForPostForm();
    } catch (error) {
        alert('Error creating category: ' + error.message);
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure? Posts in this category will become uncategorized.')) return;
    try {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete category');
        alert('Category deleted successfully!');
        fetchAdminCategories();
        loadCategoriesForPostForm();
    } catch (error) {
        alert('Error deleting category: ' + error.message);
    }
}


async function fetchPosts(category = '', page = 1) {
    try {
        let url = `${API_URL}/posts?page=${page}`;
        if (category) {
            url += `&category=${category}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        displayPosts(data.posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        const container = document.getElementById('postsContainer');
        if (container) {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Error loading posts.</p></div>';
        }
    }
}

async function fetchSinglePost(slug) {
    try {
        const response = await fetch(`${API_URL}/posts/slug/${slug}`);
        if (!response.ok) throw new Error('Post not found');
        const post = await response.json();
        displaySinglePost(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        const container = document.getElementById('postContainer');
        if (container) {
            container.innerHTML = '<div class="text-center"><p class="text-danger">Post not found.</p><a href="/" class="btn-read-more">Back to Home</a></div>';
        }
    }
}

async function createPost(formData) {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to create post');
        alert('Post created successfully!');
        document.getElementById('postForm').reset();
        fetchAdminPosts();
    } catch (error) {
        alert('Error creating post: ' + error.message);
    }
}

async function updatePost(id, formData) {
    try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to update post');
        alert('Post updated successfully!');
        document.getElementById('postForm').reset();
        document.getElementById('postId').value = '';
        fetchAdminPosts();
    } catch (error) {
        alert('Error updating post: ' + error.message);
    }
}

async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete post');
        alert('Post deleted successfully!');
        fetchAdminPosts();
    } catch (error) {
        alert('Error deleting post: ' + error.message);
    }
}

async function fetchAdminPosts() {
    try {
        const response = await fetch(`${API_URL}/admin/posts`, { credentials: 'include' });
        if (!response.ok) throw new Error('Unauthorized');
        const posts = await response.json();
        displayAdminPosts(posts);
    } catch (error) {
        console.error('Error fetching admin posts:', error);
        removeAuthenticated();
        window.location.href = '/login';
    }
}

async function loadPostForEdit(id) {
    try {
        const response = await fetch(`${API_URL}/admin/posts/${id}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load post');
        const post = await response.json();
        document.getElementById('postId').value = post._id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postExcerpt').value = post.excerpt || '';
        document.getElementById('postContent').value = post.content;
        document.getElementById('postCategory').value = post.category ? post.category._id : '';
        document.getElementById('postAuthor').value = post.author || 'Admin';
        
        const postsTab = document.getElementById('posts-tab');
        if (postsTab) {
            const tab = new bootstrap.Tab(postsTab);
            tab.show();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        alert('Error loading post: ' + error.message);
    }
}

async function loadCategoriesForPostForm() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        const select = document.getElementById('postCategory');
        if (select) {
            select.innerHTML = '<option value="">Select category...</option>' + 
                categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading categories for form:', error);
    }
}


async function submitContactForm(formData) {
    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to send message');
        alert('Message sent successfully! We will get back to you soon.');
        document.getElementById('contactForm').reset();
    } catch (error) {
        alert('Error sending message: ' + error.message);
    }
}


function displayCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    const indicators = document.getElementById('carouselIndicators');
    
    if (!container) return;
    
    const categoryIcons = { 
        'faith': '✝️', 
        'prayer': '🙏', 
        'soul-winning': '🕊️',
        'worship': '🎵',
        'testimony': '📖',
        'bible-study': '📚'
    };
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="carousel-item active"><div class="text-center py-5"><p>No categories found.</p></div></div>';
        return;
    }
    
    const categoriesPerSlide = 3;
    const slides = [];
    for (let i = 0; i < categories.length; i += categoriesPerSlide) {
        slides.push(categories.slice(i, i + categoriesPerSlide));
    }
    
    if (indicators) {
        indicators.innerHTML = slides.map((_, index) => `
            <button type="button" data-bs-target="#categoriesCarousel" data-bs-slide-to="${index}" 
                    ${index === 0 ? 'class="active" aria-current="true"' : ''} 
                    aria-label="Slide ${index + 1}"></button>
        `).join('');
    }
    
    container.innerHTML = slides.map((slideCategories, slideIndex) => `
        <div class="carousel-item ${slideIndex === 0 ? 'active' : ''}">
            <div class="row g-4 px-3">
                ${slideCategories.map(category => `
                    <div class="col-md-4">
                        <div class="category-card ${category.slug}" onclick="window.location.href='/category/${category.slug}'">
                            <div class="category-icon">${categoryIcons[category.slug] || '📖'}</div>
                            <h4>${category.name}</h4>
                            ${category.description ? `<p class="mb-0 mt-2">${category.description}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p class="lead">No posts found. Check back soon!</p></div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="col-md-6 col-lg-4">
            <div class="post-card">
                ${post.featuredImage ? `
                    <img src="${post.featuredImage}" 
                         alt="${post.title}" 
                         class="post-image"
                         onerror="this.src='https://via.placeholder.com/400x250/d3a59f/ffffff?text=${encodeURIComponent(post.title)}'">
                ` : `
                    <img src="https://via.placeholder.com/400x250/d3a59f/ffffff?text=${encodeURIComponent(post.title)}" 
                         alt="${post.title}" 
                         class="post-image">
                `}
                <div class="post-content">
                    ${post.category ? `<span class="post-category">${post.category.name}</span>` : ''}
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-meta">
                        by ${post.author || 'Admin'} | ${new Date(post.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                    </div>
                    <p class="post-excerpt">${post.excerpt || post.content.substring(0, 150) + '...'}</p>
                    <a href="/post/${post.slug}" class="btn-read-more">Read More</a>
                </div>
            </div>
        </div>
    `).join('');
}

function displaySinglePost(post) {
    const container = document.getElementById('postContainer');
    if (!container) return;
    
    document.title = `${post.title} - Living Water Ministries`;
    
    container.innerHTML = `
        <div class="post-header">
            ${post.category ? `<span class="post-category">${post.category.name}</span>` : ''}
            <h1 class="display-4 fw-bold mt-3">${post.title}</h1>
            <div class="post-meta">
                by ${post.author || 'Admin'} | ${new Date(post.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                })}
            </div>
        </div>
        ${post.featuredImage ? `
            <img src="${post.featuredImage}" alt="${post.title}" class="post-featured-image" onerror="this.style.display='none'">
        ` : ''}
        <div class="post-body">
            ${post.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
        </div>
        <div class="mt-5">
            <h5>Share this post:</h5>
            <div class="share-buttons">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="share-btn">f</a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-btn">𝕏</a>
                <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}" target="_blank" class="share-btn">in</a>
                <a href="mailto:?subject=${encodeURIComponent(post.title)}&body=Check out this post: ${encodeURIComponent(window.location.href)}" class="share-btn">✉</a>
            </div>
        </div>
    `;
}

function displayAdminPosts(posts) {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No posts yet. Create your first post above!</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-item">
            <div class="post-item-info">
                <h5 class="mb-1">${post.title}</h5>
                <small class="text-muted">
                    ${post.category ? post.category.name : 'Uncategorized'} | 
                    ${new Date(post.createdAt).toLocaleDateString()}
                </small>
            </div>
            <div class="post-item-actions">
                <button class="btn-edit" onclick="loadPostForEdit('${post._id}')">Edit</button>
                <button class="btn-delete" onclick="deletePost('${post._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function displayAdminCategories(categories) {
    const container = document.getElementById('adminCategoriesList');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No categories yet. Create your first category above!</p>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="post-item">
            <div class="post-item-info">
                <h5 class="mb-1">${category.name}</h5>
                <small class="text-muted">${category.description || 'No description'}</small>
            </div>
            <div class="post-item-actions">
                <button class="btn-delete" onclick="deleteCategory('${category._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}


function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    console.log('Attempting login...');
    login(username, password);
}

function handlePostSubmit(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('postTitle').value);
    formData.append('content', document.getElementById('postContent').value);
    formData.append('excerpt', document.getElementById('postExcerpt').value);
    formData.append('category', document.getElementById('postCategory').value);
    formData.append('author', document.getElementById('postAuthor').value);
    const imageFile = document.getElementById('postImage').files[0];
    if (imageFile) formData.append('featuredImage', imageFile);
    const postId = document.getElementById('postId').value;
    if (postId) {
        updatePost(postId, formData);
    } else {
        createPost(formData);
    }
}

function handleCategorySubmit(event) {
    event.preventDefault();
    const formData = {
        name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value
    };
    createCategory(formData);
}

function handleContactSubmit(event) {
    event.preventDefault();
    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };
    submitContactForm(formData);
}


document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    console.log('Current path:', path);
    
    // Check auth for admin page
    if (path === '/admin') {
        console.log('Admin page - checking authentication...');
        const authenticated = await checkAuth();
        console.log('Authenticated:', authenticated);
        
        if (!authenticated) {
            console.log('Not authenticated, redirecting to login...');
            removeAuthenticated();
            window.location.href = '/login';
            return;
        }
        
        console.log('Authenticated! Loading admin content...');
        setAuthenticated('true');
        fetchAdminCategories();
        fetchAdminPosts();
        loadCategoriesForPostForm();
    }
    
    if (path === '/login') {
        const authenticated = await checkAuth();
        if (authenticated) {
            console.log('Already authenticated, redirecting to admin...');
            setAuthenticated('true');
            window.location.href = '/admin';
            return;
        }
    }
    
    // Load content based on page
    if (path === '/' || path === '/index.html') {
        fetchCategories();
        fetchPosts();
    } else if (path.startsWith('/category/')) {
        const categorySlug = path.split('/category/')[1];
        fetchPosts(categorySlug);
        
        fetch(`${API_URL}/categories/${categorySlug}`)
            .then(res => res.json())
            .then(category => { 
                document.title = `${category.name} - Living Water Ministries`;
                const titleEl = document.getElementById('categoryTitle');
                const descEl = document.getElementById('categoryDescription');
                if (titleEl) titleEl.textContent = category.name;
                if (descEl) descEl.textContent = category.description || '';
            })
            .catch(err => {
                console.error('Error loading category:', err);
                const titleEl = document.getElementById('categoryTitle');
                if (titleEl) titleEl.textContent = 'Category Not Found';
            });
    } else if (path.startsWith('/post/')) {
        const postSlug = path.split('/post/')[1];
        fetchSinglePost(postSlug);
    }
    
    // Attach event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, attaching handler...');
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const postForm = document.getElementById('postForm');
    if (postForm) postForm.addEventListener('submit', handlePostSubmit);
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        logout(); 
    });
    
});