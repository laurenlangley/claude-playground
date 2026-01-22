// Sample portfolio data - replace with your actual portfolio items
const portfolioItems = [
    {
        id: 1,
        title: "Brand Identity System",
        description: "Complete brand identity design including logo, color palette, and typography for a tech startup. This project involved extensive research and multiple iterations to capture the client's vision.",
        year: "2024",
        category: "branding",
        company: "TechCorp Inc.",
        colorTone: "cool",
        image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
        size: "large"
    },
    {
        id: 2,
        title: "E-commerce Platform",
        description: "Modern responsive e-commerce website with custom shopping cart and payment integration. Built with React and Node.js.",
        year: "2023",
        category: "web",
        company: "ShopFlow",
        colorTone: "warm",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
        size: "wide"
    },
    {
        id: 3,
        title: "Urban Photography Series",
        description: "Documentary photography project capturing the essence of city life during golden hour. Featured in multiple exhibitions.",
        year: "2022",
        category: "photography",
        company: "Personal Project",
        colorTone: "warm",
        image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
        size: "tall"
    },
    {
        id: 4,
        title: "Mobile App UI/UX",
        description: "Complete UI/UX design for a fitness tracking mobile application with gamification elements.",
        year: "2024",
        category: "web",
        company: "FitLife",
        colorTone: "cool",
        image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
        size: "square"
    },
    {
        id: 5,
        title: "Illustration Collection",
        description: "Series of digital illustrations exploring abstract concepts and emotions through color and form.",
        year: "2023",
        category: "illustration",
        company: "Personal Project",
        colorTone: "warm",
        image: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
        size: "square"
    },
    {
        id: 6,
        title: "Corporate Website Redesign",
        description: "Complete redesign of corporate website with focus on accessibility and user experience. Increased conversion by 40%.",
        year: "2023",
        category: "web",
        company: "Global Solutions",
        colorTone: "neutral",
        image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80",
        size: "wide"
    },
    {
        id: 7,
        title: "Product Photography",
        description: "Commercial product photography for luxury watch brand, including studio setup and post-processing.",
        year: "2022",
        category: "photography",
        company: "Luxury Timepieces",
        colorTone: "neutral",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
        size: "square"
    },
    {
        id: 8,
        title: "Motion Graphics Package",
        description: "Animated logo reveals and lower thirds for video production company.",
        year: "2024",
        category: "illustration",
        company: "VideoWorks",
        colorTone: "cool",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
        size: "tall"
    },
    {
        id: 9,
        title: "Restaurant Branding",
        description: "Complete branding package for upscale restaurant including menu design, signage, and marketing materials.",
        year: "2021",
        category: "branding",
        company: "Bistro Moderne",
        colorTone: "warm",
        image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
        size: "square"
    },
    {
        id: 10,
        title: "Dashboard Interface Design",
        description: "Analytics dashboard with real-time data visualization and customizable widgets.",
        year: "2024",
        category: "web",
        company: "DataMetrics",
        colorTone: "cool",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
        size: "large"
    },
    {
        id: 11,
        title: "Nature Photography Collection",
        description: "Landscape photography from national parks showcasing natural beauty and environmental conservation.",
        year: "2020",
        category: "photography",
        company: "Personal Project",
        colorTone: "cool",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        size: "wide"
    },
    {
        id: 12,
        title: "Character Design Series",
        description: "Original character designs for indie game development, including concept art and variations.",
        year: "2023",
        category: "illustration",
        company: "Pixel Studios",
        colorTone: "warm",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
        size: "square"
    }
];

// DOM elements
const mosaicGrid = document.getElementById('mosaicGrid');
const modalOverlay = document.getElementById('modalOverlay');
const closeBtn = document.getElementById('closeBtn');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalYear = document.getElementById('modalYear');
const modalCategory = document.getElementById('modalCategory');
const modalCompany = document.getElementById('modalCompany');

// Filter elements
const yearFilter = document.getElementById('yearFilter');
const categoryFilter = document.getElementById('categoryFilter');
const colorFilter = document.getElementById('colorFilter');

// Current filter state
let currentFilters = {
    year: 'all',
    category: 'all',
    color: 'all'
};

// Initialize the mosaic
function initMosaic() {
    renderMosaicItems(portfolioItems);
    setupEventListeners();
}

// Render mosaic items
function renderMosaicItems(items) {
    mosaicGrid.innerHTML = '';

    items.forEach((item, index) => {
        const mosaicItem = createMosaicItem(item, index);
        mosaicGrid.appendChild(mosaicItem);
    });
}

// Create individual mosaic item
function createMosaicItem(item, index) {
    const div = document.createElement('div');
    div.className = `mosaic-item ${item.size || 'square'}`;
    div.dataset.id = item.id;
    div.dataset.year = item.year;
    div.dataset.category = item.category;
    div.dataset.color = item.colorTone;

    div.innerHTML = `
        <div class="item-bg" style="background-image: url('${item.image}');"></div>
        <div class="item-overlay">
            <div class="item-title">${item.title}</div>
            <div class="item-meta">
                <span>${item.year}</span>
                <span>${item.category}</span>
            </div>
        </div>
    `;

    div.addEventListener('click', () => openModal(item));

    return div;
}

// Open modal with zoom effect
function openModal(item) {
    modalImage.style.backgroundImage = `url('${item.image}')`;
    modalTitle.textContent = item.title;
    modalDescription.textContent = item.description;
    modalYear.textContent = `Year: ${item.year}`;
    modalCategory.textContent = `Category: ${item.category}`;
    modalCompany.textContent = `Client: ${item.company}`;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Filter items based on current filters
function filterItems() {
    const allItems = document.querySelectorAll('.mosaic-item');

    allItems.forEach(item => {
        const yearMatch = currentFilters.year === 'all' || matchYearRange(item.dataset.year, currentFilters.year);
        const categoryMatch = currentFilters.category === 'all' || item.dataset.category === currentFilters.category;
        const colorMatch = currentFilters.color === 'all' || item.dataset.color === currentFilters.color;

        if (yearMatch && categoryMatch && colorMatch) {
            item.classList.remove('hidden');
            // Re-trigger animation
            item.style.animation = 'none';
            setTimeout(() => {
                item.style.animation = '';
            }, 10);
        } else {
            item.classList.add('hidden');
        }
    });
}

// Match year range helper
function matchYearRange(year, range) {
    if (range === 'all') return true;

    const yearNum = parseInt(year);
    const [start, end] = range.split('-').map(y => parseInt(y));

    return yearNum >= start && yearNum <= end;
}

// Setup event listeners
function setupEventListeners() {
    // Close modal events
    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Keyboard event for ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // Filter events
    yearFilter.addEventListener('change', (e) => {
        currentFilters.year = e.target.value;
        filterItems();
    });

    categoryFilter.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        filterItems();
    });

    colorFilter.addEventListener('change', (e) => {
        currentFilters.color = e.target.value;
        filterItems();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initMosaic);

// Export functions for future expansion
window.portfolioApp = {
    addItem: function(item) {
        portfolioItems.push(item);
        renderMosaicItems(portfolioItems);
    },
    removeItem: function(id) {
        const index = portfolioItems.findIndex(item => item.id === id);
        if (index > -1) {
            portfolioItems.splice(index, 1);
            renderMosaicItems(portfolioItems);
        }
    },
    getItems: function() {
        return portfolioItems;
    },
    updateFilters: function(filters) {
        currentFilters = { ...currentFilters, ...filters };
        filterItems();
    }
};
