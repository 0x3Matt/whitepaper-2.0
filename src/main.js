// UTribe Documentation - Main JavaScript
// Updated: 2024 - GitBook-like documentation website functionality

import { marked } from 'marked';
import hljs from 'highlight.js';
import Fuse from 'fuse.js';
import mermaid from 'mermaid';

class UTribeDocumentation {
  constructor() {
    this.currentPage = '';
    this.pages = [];
    this.searchIndex = null;
    this.theme = localStorage.getItem('theme') || 'light';
    
    this.init();
  }

  async init() {
    this.setupMarked();
    this.setupMermaid();
    this.setupEventListeners();
    this.setupTheme();
    await this.loadDocumentationStructure();
    this.setupSearch();
    this.hideLoading();
  }

  setupMarked() {
    // Configure marked with highlight.js
    marked.setOptions({
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
      langPrefix: 'hljs language-',
      breaks: true,
      gfm: true
    });

    // Custom renderer for better GitBook-like styling
    const renderer = new marked.Renderer();
    
    renderer.heading = function(text, level) {
      const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h${level} id="${escapedText}">${text}</h${level}>`;
    };

    renderer.code = function(code, infostring, escaped) {
      const lang = (infostring || '').match(/\S*/)[0];
      if (this.options.highlight) {
        const out = this.options.highlight(code, lang);
        if (out != null && out !== code) {
          escaped = true;
          code = out;
        }
      }

      if (!lang) {
        return '<pre><code>' + (escaped ? code : escape(code, true)) + '</code></pre>';
      }

      return '<pre><code class="' + this.options.langPrefix + escape(lang, true) + '">'
        + (escaped ? code : escape(code, true))
        + '</code></pre>\n';
    };

    marked.use({ renderer });
  }

  setupMermaid() {
    // Initialize Mermaid with custom configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: this.theme === 'dark' ? 'dark' : 'default',
      themeVariables: {
        primaryColor: '#4f46e5',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#4f46e5',
        lineColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#ffffff',
        background: '#ffffff',
        mainBkg: '#ffffff',
        secondBkg: '#f9fafb',
        tertiaryBkg: '#f3f4f6'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: true,
        wrap: true
      },
      journey: {
        useMaxWidth: true
      }
    });
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Navigation buttons
    document.getElementById('prev-page').addEventListener('click', () => {
      this.navigateToPreviousPage();
    });

    document.getElementById('next-page').addEventListener('click', () => {
      this.navigateToNextPage();
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        document.getElementById('search-results').style.display = 'none';
      }
    });

    // Mobile sidebar overlay click handler
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Close sidebar when clicking on navigation links (mobile)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item') && window.innerWidth <= 767) {
        // Small delay to allow navigation to complete
        setTimeout(() => {
          this.toggleSidebar();
        }, 100);
      }
    });

    // Handle window resize - close sidebar on desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const body = document.body;
        
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        body.classList.remove('sidebar-open');
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.loadPage(e.state.page, false);
      }
    });
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    
    // Update highlight.js theme
    const lightTheme = document.getElementById('hljs-light');
    const darkTheme = document.getElementById('hljs-dark');
    
    if (this.theme === 'dark') {
      lightTheme.disabled = true;
      darkTheme.disabled = false;
    } else {
      lightTheme.disabled = false;
      darkTheme.disabled = true;
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.setupTheme();
    this.setupMermaid();
    // Re-render mermaid diagrams with new theme if current page has them
    if (this.currentPage) {
      this.renderMermaidDiagrams();
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
      // Close sidebar
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      body.classList.remove('sidebar-open');
    } else {
      // Open sidebar
      sidebar.classList.add('open');
      overlay.classList.add('show');
      body.classList.add('sidebar-open');
    }
  }

  async loadDocumentationStructure() {
    try {
      // Load the documentation structure
      const response = await fetch('/docs/structure.json');
      const structure = await response.json();
      
      this.pages = this.flattenPages(structure.sections);
      this.renderNavigation(structure.sections);
      
      // Load initial page
      const initialPage = this.getInitialPage();
      await this.loadPage(initialPage, false);
      
    } catch (error) {
      console.error('Failed to load documentation structure:', error);
      this.showError('Failed to load documentation. Please check your connection.');
    }
  }

  flattenPages(sections) {
    const pages = [];
    
    function traverse(items, parentPath = '') {
      items.forEach(item => {
        if (item.path) {
          pages.push({
            ...item,
            fullPath: parentPath ? `${parentPath}/${item.path}` : item.path
          });
        }
        if (item.children) {
          traverse(item.children, item.path || parentPath);
        }
      });
    }
    
    traverse(sections);
    return pages;
  }

  renderNavigation(sections) {
    const navMenu = document.getElementById('nav-menu');
    navMenu.innerHTML = this.renderNavItems(sections);
    
    // Add click listeners to nav items
    navMenu.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-item')) {
        e.preventDefault();
        const path = e.target.getAttribute('data-path');
        if (path) {
          this.loadPage(path);
        }
      }
    });
  }

  renderNavItems(items, level = 0) {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const isSubItem = level > 0;
      
      let html = '';
      
      if (item.title && !item.path && !hasChildren) {
        // Section title with icon
        const sectionIcon = this.getIconSVG(item.icon);
        html += `<div class="nav-section-title">
          ${sectionIcon}
          <span>${item.title}</span>
        </div>`;
      } else if (hasChildren && !item.path) {
        // Section with children
        const sectionIcon = this.getIconSVG(item.icon);
        html += `<div class="nav-section-title">
          ${sectionIcon}
          <span>${item.title}</span>
        </div>`;
        html += this.renderNavItems(item.children, level + 1);
      } else if (item.path) {
        // Navigation item with icon
        const itemIcon = this.getIconSVG(item.icon);
        html += `<a href="#${item.path}" class="nav-item ${isSubItem ? 'sub-item' : ''}" data-path="${item.path}">
          ${itemIcon}
          <span>${item.title}</span>
        </a>`;
      }
      
      return html;
    }).join('');
  }

  getIconSVG(iconName) {
    if (!iconName) return '';
    
    const icons = {
      'play-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10,8 16,12 10,16 10,8"></polygon></svg>',
      'home': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>',
      'zap': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon></svg>',
      'lightbulb': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6"></path><path d="M12 17c-3.3 0-6-2.7-6-6 0-3.3 2.7-6 6-6s6 2.7 6 6c0 3.3-2.7 6-6 6z"></path><path d="M12 3V1"></path><path d="M12 23v-2"></path><path d="m20.49 20.49-1.41-1.41"></path><path d="m3.51 3.51 1.41 1.41"></path><path d="M23 12h-2"></path><path d="M1 12h2"></path><path d="m20.49 3.51-1.41 1.41"></path><path d="m3.51 20.49 1.41-1.41"></path></svg>',
      'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>',
      'target': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
      'alert-triangle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="m12 17 .01 0"></path></svg>',
      'star': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"></polygon></svg>',
      'cpu': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 20v3"></path><path d="M15 20v3"></path><path d="M20 9h3"></path><path d="M20 14h3"></path><path d="M1 9h3"></path><path d="M1 14h3"></path></svg>',
      'dollar-sign': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
      'users': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      'map': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
      'user-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17,11 19,13 23,9"></polyline></svg>',
      'heart': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'handshake': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2z"></path><path d="M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7"></path><path d="M 7.5 8 L 10.5 11 L 16 5.5"></path></svg>',
      'shield': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      'message-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
      'help-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>'
    };
    
    return icons[iconName] || '';
  }

  getInitialPage() {
    const hash = window.location.hash.slice(1);
    return hash || this.pages[0]?.path || 'introduction';
  }

  async loadPage(path, pushState = true) {
    try {
      this.showLoading();
      
      // Update URL
      if (pushState) {
        history.pushState({ page: path }, '', `#${path}`);
      }
      
      // Load markdown content
      const response = await fetch(`/docs/content/${path}.md`);
      if (!response.ok) {
        throw new Error(`Page not found: ${path}`);
      }
      
      const markdown = await response.text();
      const html = marked(markdown);
      
      // Update content
      document.getElementById('content').innerHTML = html;
      
      // Render Mermaid diagrams
      await this.renderMermaidDiagrams();
      
      // Update navigation
      this.updateActiveNavigation(path);
      this.updateBreadcrumb(path);
      this.updateNavigationButtons(path);
      
      // Update page info
      this.currentPage = path;
      document.getElementById('last-updated').textContent = new Date().toLocaleDateString();
      
      // Scroll to top
      document.getElementById('main-content').scrollTop = 0;
      
      this.hideLoading();
      
    } catch (error) {
      console.error('Failed to load page:', error);
      this.showError(`Failed to load page: ${path}`);
      this.hideLoading();
    }
  }

  updateActiveNavigation(path) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to current page
    const activeItem = document.querySelector(`[data-path="${path}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  updateBreadcrumb(path) {
    const page = this.pages.find(p => p.path === path);
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (page) {
      const parts = path.split('/');
      const breadcrumbHtml = parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        const partPath = parts.slice(0, index + 1).join('/');
        const partPage = this.pages.find(p => p.path === partPath);
        const title = partPage ? partPage.title : part;
        
        if (isLast) {
          return `<span class="breadcrumb-item">${title}</span>`;
        } else {
          return `<a href="#${partPath}" class="breadcrumb-item">${title}</a><span class="breadcrumb-separator"></span>`;
        }
      }).join('');
      
      breadcrumb.innerHTML = breadcrumbHtml;
    }
  }

  updateNavigationButtons(path) {
    const currentIndex = this.pages.findIndex(p => p.path === path);
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Previous button
    if (currentIndex > 0) {
      prevBtn.disabled = false;
      prevBtn.onclick = () => this.loadPage(this.pages[currentIndex - 1].path);
    } else {
      prevBtn.disabled = true;
    }
    
    // Next button
    if (currentIndex < this.pages.length - 1) {
      nextBtn.disabled = false;
      nextBtn.onclick = () => this.loadPage(this.pages[currentIndex + 1].path);
    } else {
      nextBtn.disabled = true;
    }
  }

  setupSearch() {
    // Create search index
    const searchData = this.pages.map(page => ({
      title: page.title,
      path: page.path,
      content: page.description || ''
    }));
    
    this.searchIndex = new Fuse(searchData, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeMatches: true
    });
  }

  handleSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query.trim()) {
      resultsContainer.style.display = 'none';
      return;
    }
    
    const results = this.searchIndex.search(query);
    
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result">No results found</div>';
    } else {
      resultsContainer.innerHTML = results.slice(0, 5).map(result => {
        const page = result.item;
        return `
          <div class="search-result" data-path="${page.path}">
            <div class="search-result-title">${page.title}</div>
            <div class="search-result-excerpt">${page.content}</div>
          </div>
        `;
      }).join('');
    }
    
    resultsContainer.style.display = 'block';
    
    // Add click listeners to search results
    resultsContainer.addEventListener('click', (e) => {
      const result = e.target.closest('.search-result');
      if (result) {
        const path = result.getAttribute('data-path');
        if (path) {
          this.loadPage(path);
          resultsContainer.style.display = 'none';
          document.getElementById('search-input').value = '';
        }
      }
    });
  }

  navigateToPreviousPage() {
    const currentIndex = this.pages.findIndex(p => p.path === this.currentPage);
    if (currentIndex > 0) {
      this.loadPage(this.pages[currentIndex - 1].path);
    }
  }

  navigateToNextPage() {
    const currentIndex = this.pages.findIndex(p => p.path === this.currentPage);
    if (currentIndex < this.pages.length - 1) {
      this.loadPage(this.pages[currentIndex + 1].path);
    }
  }

  showLoading() {
    document.getElementById('loading').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }

  showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }

  async renderMermaidDiagrams() {
    // Find all mermaid code blocks
    const mermaidElements = document.querySelectorAll('pre code.language-mermaid');
    
    for (let i = 0; i < mermaidElements.length; i++) {
      const element = mermaidElements[i];
      const mermaidCode = element.textContent;
      
      try {
        // Create a unique ID for this diagram
        const diagramId = `mermaid-diagram-${Date.now()}-${i}`;
        
        // Create a div to hold the rendered diagram
        const diagramDiv = document.createElement('div');
        diagramDiv.id = diagramId;
        diagramDiv.className = 'mermaid-diagram';
        diagramDiv.style.textAlign = 'center';
        diagramDiv.style.margin = '1rem 0';
        
        // Render the mermaid diagram
        const { svg } = await mermaid.render(diagramId + '-svg', mermaidCode);
        diagramDiv.innerHTML = svg;
        
        // Replace the code block with the rendered diagram
        element.parentElement.replaceWith(diagramDiv);
        
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
        // Keep the original code block if rendering fails
        element.parentElement.innerHTML = `
          <div class="mermaid-error" style="background: #fee; border: 1px solid #fcc; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
            <strong>Mermaid Diagram Error:</strong>
            <pre style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${mermaidCode}</pre>
          </div>
        `;
      }
    }
  }
}

// Initialize the documentation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new UTribeDocumentation();
});

// Helper function for escaping HTML
function escape(html, encode) {
  if (encode) {
    if (escape.escapeTest.test(html)) {
      return html.replace(escape.escapeReplace, function (match) {
        return escape.replacements[match];
      });
    }
  } else {
    if (escape.escapeTestNoEncode.test(html)) {
      return html.replace(escape.escapeReplaceNoEncode, function (match) {
        return escape.replacements[match];
      });
    }
  }

  return html;
}

escape.escapeTest = /[&<>"']/;
escape.escapeReplace = /[&<>"']/g;
escape.replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
escape.escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
escape.escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;