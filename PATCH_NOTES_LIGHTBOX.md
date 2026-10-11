# Patch Notes Image Lightbox

Add this to your Wix page's custom code section (both CSS and JavaScript).

## CSS (add to your existing styles):

```css
/* Patch Notes Images - Make clickable */
.patch-image img,
div.patch-image img,
[class*="patch-image"] img {
    display: block !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    margin: 0 auto !important;
    border-radius: 3px !important;
    cursor: pointer !important;
    transition: opacity 0.2s ease !important;
}

.patch-image img:hover,
div.patch-image img:hover,
[class*="patch-image"] img:hover {
    opacity: 0.9 !important;
}

/* Lightbox Overlay */
.patch-lightbox-overlay {
    display: none;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.95) !important;
    z-index: 9999 !important;
    cursor: pointer !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    box-sizing: border-box !important;
}

.patch-lightbox-overlay.active {
    display: flex !important;
}

.patch-lightbox-content {
    max-width: 90% !important;
    max-height: 90% !important;
    width: auto !important;
    height: auto !important;
    position: relative !important;
    cursor: default !important;
}

.patch-lightbox-content img {
    max-width: 100% !important;
    max-height: 90vh !important;
    width: auto !important;
    height: auto !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
}

.patch-lightbox-close {
    position: absolute !important;
    top: -40px !important;
    right: 0 !important;
    color: white !important;
    font-size: 32px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    line-height: 1 !important;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
    user-select: none !important;
}

.patch-lightbox-close:hover {
    opacity: 0.8 !important;
}
```

## JavaScript (add to your page):

```javascript
<script>
(function() {
    // Wait for DOM to be ready
    function initLightbox() {
        // Ensure body exists
        if (!document.body) {
            setTimeout(initLightbox, 100);
            return;
        }
        
        // Create lightbox overlay if it doesn't exist
        let lightbox = document.getElementById('patch-lightbox-overlay');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'patch-lightbox-overlay';
            lightbox.className = 'patch-lightbox-overlay';
            lightbox.innerHTML = '<div class="patch-lightbox-content"><span class="patch-lightbox-close">&times;</span><img src="" alt="Patch note image" /></div>';
            
            // Try to append to body, fallback to documentElement if needed
            if (document.body) {
                document.body.appendChild(lightbox);
            } else if (document.documentElement) {
                document.documentElement.appendChild(lightbox);
            } else {
                console.error('Cannot find document.body or document.documentElement');
                return;
            }
        }
    
    const lightboxContent = lightbox.querySelector('.patch-lightbox-content');
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.patch-lightbox-close');
    
    // Function to open lightbox
    function openLightbox(imgSrc) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    // Function to close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Add click handlers to all patch note images
    function attachLightboxHandlers() {
        const patchImages = document.querySelectorAll('.patch-image img, div.patch-image img, [class*="patch-image"] img');
        patchImages.forEach(function(img) {
            // Remove existing handler to avoid duplicates
            img.removeEventListener('click', img._lightboxHandler);
            
            // Add new handler
            img._lightboxHandler = function(e) {
                e.stopPropagation();
                openLightbox(img.src);
            };
            img.addEventListener('click', img._lightboxHandler);
        });
    }
    
    // Close on overlay click
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target === lightboxClose) {
            closeLightbox();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
    
        // Attach handlers when page loads
        function setupHandlers() {
            if (!document.body) {
                setTimeout(setupHandlers, 100);
                return;
            }
            
            attachLightboxHandlers();
            
            // Re-attach handlers when content changes (for dynamic content)
            const observer = new MutationObserver(function(mutations) {
                attachLightboxHandlers();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupHandlers);
        } else {
            setupHandlers();
        }
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLightbox);
    } else {
        // Small delay to ensure Wix has initialized
        setTimeout(initLightbox, 100);
    }
})();
</script>
```

## Complete Solution (All-in-One):

If you prefer a single block to paste, here's everything together:

```html
<style>
/* Patch Notes Images - Make clickable */
.patch-image img,
div.patch-image img,
[class*="patch-image"] img {
    cursor: pointer !important;
    transition: opacity 0.2s ease !important;
}

.patch-image img:hover,
div.patch-image img:hover,
[class*="patch-image"] img:hover {
    opacity: 0.9 !important;
}

/* Lightbox Overlay */
.patch-lightbox-overlay {
    display: none;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.95) !important;
    z-index: 9999 !important;
    cursor: pointer !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    box-sizing: border-box !important;
}

.patch-lightbox-overlay.active {
    display: flex !important;
}

.patch-lightbox-content {
    max-width: 90% !important;
    max-height: 90% !important;
    width: auto !important;
    height: auto !important;
    position: relative !important;
    cursor: default !important;
}

.patch-lightbox-content img {
    max-width: 100% !important;
    max-height: 90vh !important;
    width: auto !important;
    height: auto !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
}

.patch-lightbox-close {
    position: absolute !important;
    top: -40px !important;
    right: 0 !important;
    color: white !important;
    font-size: 32px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    line-height: 1 !important;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
    user-select: none !important;
}

.patch-lightbox-close:hover {
    opacity: 0.8 !important;
}
</style>

<script>
(function() {
    let lightbox = document.getElementById('patch-lightbox-overlay');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'patch-lightbox-overlay';
        lightbox.className = 'patch-lightbox-overlay';
        lightbox.innerHTML = '<div class="patch-lightbox-content"><span class="patch-lightbox-close">&times;</span><img src="" alt="Patch note image" /></div>';
        document.body.appendChild(lightbox);
    }
    
    const lightboxContent = lightbox.querySelector('.patch-lightbox-content');
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.patch-lightbox-close');
    
    function openLightbox(imgSrc) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function attachLightboxHandlers() {
        const patchImages = document.querySelectorAll('.patch-image img, div.patch-image img, [class*="patch-image"] img');
        patchImages.forEach(function(img) {
            img.removeEventListener('click', img._lightboxHandler);
            img._lightboxHandler = function(e) {
                e.stopPropagation();
                openLightbox(img.src);
            };
            img.addEventListener('click', img._lightboxHandler);
        });
    }
    
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target === lightboxClose) {
            closeLightbox();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachLightboxHandlers);
    } else {
        attachLightboxHandlers();
    }
    
    const observer = new MutationObserver(function(mutations) {
        attachLightboxHandlers();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
</script>
```

## Features:

✅ **Click to open**: Click any patch note image to open in lightbox  
✅ **Click to close**: Click overlay or X button to close  
✅ **Escape key**: Press Escape to close  
✅ **Auto-attach**: Automatically attaches to new images (works with dynamic content)  
✅ **Responsive**: Images scale to fit screen  
✅ **Smooth**: Fade transitions  
✅ **Mobile-friendly**: Works on touch devices  

## How to Add to Wix:

1. Go to your Wix page editor
2. Click **Settings** → **Custom Code**
3. Add the CSS to **Head** section
4. Add the JavaScript to **Body - End** section
5. Save and publish

That's it! All patch note images will now be clickable and open in a fullscreen lightbox.

