# Patch Notes Image Lightbox - Fixed Version

This version is more robust and works better with Wix's environment.

## CSS (add to your existing Patch Notes CSS):

```css
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
```

## JavaScript (Fixed - More Robust):

```javascript
<script>
(function() {
    'use strict';
    
    let lightbox = null;
    let lightboxImg = null;
    let lightboxClose = null;
    let isInitialized = false;
    
    // Wait for DOM to be ready
    function waitForBody(callback, maxAttempts) {
        maxAttempts = maxAttempts || 50;
        let attempts = 0;
        
        function check() {
            attempts++;
            if (document.body && document.body.appendChild) {
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.warn('Patch Notes Lightbox: Could not find document.body after ' + maxAttempts + ' attempts');
            }
        }
        
        check();
    }
    
    // Create lightbox overlay
    function createLightbox() {
        if (lightbox) return lightbox;
        
        lightbox = document.createElement('div');
        lightbox.id = 'patch-lightbox-overlay';
        lightbox.className = 'patch-lightbox-overlay';
        lightbox.innerHTML = '<div class="patch-lightbox-content"><span class="patch-lightbox-close">&times;</span><img src="" alt="Patch note image" /></div>';
        
        document.body.appendChild(lightbox);
        
        lightboxImg = lightbox.querySelector('img');
        lightboxClose = lightbox.querySelector('.patch-lightbox-close');
        
        return lightbox;
    }
    
    // Function to open lightbox
    function openLightbox(imgSrc) {
        if (!lightbox) {
            createLightbox();
        }
        if (lightboxImg) {
            lightboxImg.src = imgSrc;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Function to close lightbox
    function closeLightbox() {
        if (lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Add click handlers to all patch note images
    function attachLightboxHandlers() {
        if (!document.body) return;
        
        const patchImages = document.querySelectorAll('.patch-image img, div.patch-image img, [class*="patch-image"] img');
        patchImages.forEach(function(img) {
            // Skip if already has handler
            if (img.dataset.lightboxAttached === 'true') {
                return;
            }
            
            img.dataset.lightboxAttached = 'true';
            
            img.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openLightbox(this.src);
            }, false);
        });
    }
    
    // Initialize
    function init() {
        if (isInitialized) return;
        isInitialized = true;
        
        waitForBody(function() {
            createLightbox();
            
            // Close handlers
            if (lightbox) {
                lightbox.addEventListener('click', function(e) {
                    if (e.target === lightbox || e.target === lightboxClose) {
                        closeLightbox();
                    }
                });
            }
            
            // Escape key handler
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
                    closeLightbox();
                }
            });
            
            // Initial attachment
            attachLightboxHandlers();
            
            // Watch for new images (for dynamic content)
            if (window.MutationObserver && document.body) {
                const observer = new MutationObserver(function(mutations) {
                    attachLightboxHandlers();
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Small delay for Wix
        setTimeout(init, 200);
    }
    
    // Also try on window load as fallback
    window.addEventListener('load', function() {
        setTimeout(init, 100);
    });
})();
</script>
```

## About Having Both CSS Files:

**Yes, that's fine!** Having CSS in both places is perfectly okay:
- CSS rules merge together
- More specific rules override less specific ones
- Having image styles in both files is redundant but harmless
- The `!important` flags ensure they apply

You could consolidate them into one file if you want, but it's not necessary.

## The Fix:

The error was happening because the script tried to access `document.body` before it existed. The fixed version:
1. ✅ Waits for `document.body` to exist
2. ✅ Has retry logic with timeouts
3. ✅ Uses `dataset` to track attached handlers (prevents duplicates)
4. ✅ More defensive error handling
5. ✅ Works with Wix's delayed DOM loading

Try the fixed JavaScript version - it should work now!



