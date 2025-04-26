// Using your provided JSON data
        ;

// Add this at the start of your script, around line 600
// Mobile detection and optimization
      const igp_isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


// Variables to control image loading
       let igp_isLoading = false;
       let igp_scrollTimeout = null;
       let igp_currentImageIndex = 0;
       let igp_allImages = [];
       let igp_visibleItems = new Set();
       let igp_itemHeight = 0;
       let igp_itemsPerRow = 5;
       let igp_visibleRowsCount = 0;
       let igp_totalRows = 0;
       let igp_visibleStartRow = 0;
       let igp_visibleEndRow = 0;
       let igp_bufferRows = 3; // Reduced buffer rows to minimize DOM operations
       let igp_imageLoadQueue = [];
       let igp_isProcessingQueue = false;
	   
	   // Adjust parameters for mobile
      if (igp_isMobile) {
          igp_itemsPerRow = 3; // Reduce columns on mobile
          igp_bufferRows = 1; // Minimize buffer for better performance
      }
	//   let igp_imageCache = new Map(); // Store loaded images
       
       // DOM elements
       const igp_showImagesBtn = document.getElementById('igp_showImages');
       const igp_galleryOverlay = document.getElementById('igp_galleryOverlay');
       const igp_closeGalleryBtn = document.getElementById('igp_closeGallery');
       const igp_galleryGrid = document.getElementById('igp_galleryGrid');
       const igp_loadingIndicator = document.getElementById('igp_loadingIndicator');
       const igp_galleryContent = document.getElementById('igp_galleryContent');
       
       // Image preview elements
       const igp_imagePreviewOverlay = document.getElementById('igp_imagePreviewOverlay');
       const igp_closeImagePreviewBtn = document.getElementById('igp_closeImagePreview');
       const igp_previewImage = document.getElementById('igp_previewImage');
       const igp_previewTitle = document.getElementById('igp_previewTitle');
       const igp_prevImageBtn = document.getElementById('igp_prevImage');
       const igp_nextImageBtn = document.getElementById('igp_nextImage');

       // Initialize gallery sizes and calculate visible items count
       function igp_initGallerySizes() {
           // Calculate how many items can fit in the viewport
           const containerWidth = igp_galleryContent.clientWidth - 40; // Accounting for padding
           const containerHeight = igp_galleryContent.clientHeight;
           
           const itemWidth = (containerWidth - (igp_itemsPerRow - 1) * 10) / igp_itemsPerRow; // Accounting for gap
           igp_itemHeight = itemWidth; // Items are square (aspect-ratio: 1/1)
           
           // Calculate visible rows (plus buffer)
           igp_visibleRowsCount = Math.ceil(containerHeight / (igp_itemHeight + 10)) + igp_bufferRows;
           
           // Calculate total rows needed
           igp_totalRows = Math.ceil(igp_allImages.length / igp_itemsPerRow);
       }

       // Process images in queue with throttling
       function igp_processImageQueue() {
           if (igp_imageLoadQueue.length === 0) {
               igp_isProcessingQueue = false;
               return;
           }
           
           igp_isProcessingQueue = true;
           
           // Take the next item from the queue
           const nextImg = igp_imageLoadQueue.shift();
           
           // Set the src to start loading
           nextImg.img.src = nextImg.img.dataset.src;
           
           // Process next item after a small delay (throttling)
           setTimeout(() => {
                   igp_processImageQueue();
               }, igp_isMobile ? 100 : 50); // 100ms delay on mobile, 50ms on desktop
       }

       // Queue an image for loading
       function igp_queueImageForLoading(img, galleryItem) {
           const imageUrl = img.dataset.src;
           
           // Check if this image is already cached
           if (igp_imageCache.has(imageUrl)) {
               // If it's cached, set it immediately
               img.src = imageUrl;
               galleryItem.classList.add('loaded');
               return;
           }
           
           igp_imageLoadQueue.push({
               img: img,
               onload: () => {
                   galleryItem.classList.add('loaded');
                   // Add to cache when loaded
                   igp_imageCache.set(imageUrl, true);
               }
           });
           
           img.onload = () => {
               galleryItem.classList.add('loaded');
               // Add to cache when loaded
               igp_imageCache.set(imageUrl, true);
           };
           
           // Start processing queue if not already running
           if (!igp_isProcessingQueue) {
               igp_processImageQueue();
           }
       }

       // Load images metadata
       function igp_loadImages() {
           igp_isLoading = true;
           igp_loadingIndicator.style.display = 'flex';
           
           // Process images data - ensure all items have titles
           igp_allImages = igp_imagesJson.images.map((image, index) => {
               // If image doesn't have a title, generate one based on the index
               if (!image.title) {
                   return { ...image, title: `Image ${index + 1}` };
               }
               return image;
           });
           
           // Initialize sizes
           igp_initGallerySizes();
           
           // Setup placeholder for total height
           igp_setupPlaceholder();
           
           // Render visible items
           igp_renderVisibleItems(0);
           
           igp_isLoading = false;
           igp_loadingIndicator.style.display = 'none';
       }
       
       // Set up placeholder element to maintain scroll height
       function igp_setupPlaceholder() {
           const totalHeight = igp_totalRows * (igp_itemHeight + 10) - 10; // Last row doesn't have gap
           
           // Create or update the placeholder
           let placeholder = igp_galleryGrid.querySelector('.igp_placeholder');
           if (!placeholder) {
               placeholder = document.createElement('div');
               placeholder.className = 'igp_placeholder';
               igp_galleryGrid.appendChild(placeholder);
           }
           
           placeholder.style.height = `${totalHeight}px`;
       }
       
       // Create a document fragment for batch DOM operations
       function igp_createItemsFragment(startIndex, endIndex) {
           const fragment = document.createDocumentFragment();
           
           for (let i = startIndex; i <= endIndex; i++) {
               if (i >= igp_allImages.length) break;
               
               const image = igp_allImages[i];
               const row = Math.floor(i / igp_itemsPerRow);
               const col = i % igp_itemsPerRow;
               
               const galleryItem = document.createElement('div');
               galleryItem.className = 'igp_gallery-item';
               galleryItem.dataset.index = i;
               galleryItem.dataset.title = image.title;
               
               // Get the image path and create small image path
               const imagePath = image.url;
               const lastSlashIndex = imagePath.lastIndexOf('/');
               const imageFolder = imagePath.substring(0, lastSlashIndex);
               const imageFile = imagePath.substring(lastSlashIndex + 1);
               const smallImageUrl = `${imageFolder}/thumbnails/${imageFile}`;
               
               // Store both URLs
               galleryItem.dataset.thumbnailUrl = smallImageUrl;
               galleryItem.dataset.fullUrl = image.url;
               
               // Position the item absolutely using transform (better performance than top/left)
               galleryItem.style.position = 'absolute';
               galleryItem.style.transform = `translate(${col * (igp_itemHeight + 10)}px, ${row * (igp_itemHeight + 10)}px)`;
               galleryItem.style.width = `${igp_itemHeight}px`;
               galleryItem.style.height = `${igp_itemHeight}px`;
               
               // Add click event
               galleryItem.addEventListener('click', function() {
                   igp_currentImageIndex = parseInt(this.dataset.index);
                   // Use the full-size image for the preview
                   igp_showImagePreview(this.dataset.fullUrl, this.dataset.title);
               });
               
               // Create image with lazy loading
               const img = document.createElement('img');
               img.alt = image.title;
               // Use small image for the gallery thumbnail
               img.dataset.src = smallImageUrl;
               
               galleryItem.appendChild(img);
               fragment.appendChild(galleryItem);
               
               // Queue image for loading (throttled)
               igp_queueImageForLoading(img, galleryItem);
           }
           
           return fragment;
       }
       
       // Render only the items that are currently visible
       function igp_renderVisibleItems(scrollTop) {
           // Determine which rows are visible
           const currentScrollTop = scrollTop !== undefined ? scrollTop : igp_galleryContent.scrollTop;
           const newVisibleStartRow = Math.max(0, Math.floor(currentScrollTop / (igp_itemHeight + 10)) - igp_bufferRows);
           const newVisibleEndRow = Math.min(igp_totalRows - 1, newVisibleStartRow + igp_visibleRowsCount + igp_bufferRows);
           
           // If the visible range hasn't changed significantly, don't re-render
           if (Math.abs(newVisibleStartRow - igp_visibleStartRow) <= igp_bufferRows && 
               Math.abs(newVisibleEndRow - igp_visibleEndRow) <= igp_bufferRows && 
               igp_visibleItems.size > 0) {
               return;
           }
           
           // Calculate which item indices should be visible
           const startIndex = newVisibleStartRow * igp_itemsPerRow;
           const endIndex = Math.min(igp_allImages.length - 1, (newVisibleEndRow + 1) * igp_itemsPerRow - 1);
           
           // Create a set of indices that should be visible
           const newVisibleIndices = new Set();
           for (let i = startIndex; i <= endIndex; i++) {
               newVisibleIndices.add(i);
           }
           
           // Find items to remove (no longer visible)
           const indicesToRemove = [];
           igp_visibleItems.forEach(idx => {
               if (!newVisibleIndices.has(idx)) {
                   indicesToRemove.push(idx);
               }
           });
           
           // Find items to add (newly visible)
           const indicesToAdd = [];
           newVisibleIndices.forEach(idx => {
               if (!igp_visibleItems.has(idx) && idx < igp_allImages.length) {
                   indicesToAdd.push(idx);
               }
           });
           
           // Only proceed with DOM updates if necessary
           if (indicesToRemove.length > 0 || indicesToAdd.length > 0) {
               // Batch remove operations
               if (indicesToRemove.length > 0) {
                   // Batch remove in a single operation
                   const selector = indicesToRemove.map(idx => `.igp_gallery-item[data-index="${idx}"]`).join(',');
                   const itemsToRemove = igp_galleryGrid.querySelectorAll(selector);
                   
                   itemsToRemove.forEach(item => {
                       igp_galleryGrid.removeChild(item);
                       igp_visibleItems.delete(parseInt(item.dataset.index));
                   });
               }
               
               // Batch add operations
               if (indicesToAdd.length > 0) {
                   // Use document fragment to batch DOM insertions
                   const minIndex = Math.min(...indicesToAdd);
                   const maxIndex = Math.max(...indicesToAdd);
                   const fragment = igp_createItemsFragment(minIndex, maxIndex);
                   
                   igp_galleryGrid.appendChild(fragment);
                   
                   // Update visible items tracking
                   indicesToAdd.forEach(idx => {
                       igp_visibleItems.add(idx);
                   });
               }
           }
           
           igp_visibleStartRow = newVisibleStartRow;
           igp_visibleEndRow = newVisibleEndRow;
       }

       // Handle scroll with throttling using requestAnimationFrame
       function igp_handleScroll() {
           if (igp_scrollTimeout) {
               return; // Skip if we already have a pending frame
           }
           
           igp_scrollTimeout = requestAnimationFrame(() => {
               igp_renderVisibleItems();
               igp_scrollTimeout = null;
           });
       }

       // Show large image preview
       function igp_showImagePreview(imageUrl, imageTitle) {
           // Clear previous image before loading new one
           igp_previewImage.src = '';
           
           // Add a small delay before loading the new image (prevents UI stutter)
           setTimeout(() => {
               igp_previewImage.src = imageUrl;
               igp_previewTitle.textContent = imageTitle;
               igp_imagePreviewOverlay.style.display = 'flex';
               
               // Update navigation buttons visibility
               igp_updateNavigationButtons();
           }, 10);
       }
       
       // Close image preview
       function igp_closeImagePreview() {
           igp_imagePreviewOverlay.style.display = 'none';
           igp_previewImage.src = ''; // Clear the image to free memory
       }
       
       // Navigate to previous image
       function igp_showPreviousImage() {
           if (igp_currentImageIndex > 0) {
               igp_currentImageIndex--;
               // Clear previous image first
               igp_previewImage.src = '';
               setTimeout(() => {
                   igp_previewImage.src = igp_allImages[igp_currentImageIndex].url;
                   igp_previewTitle.textContent = igp_allImages[igp_currentImageIndex].title;
                   igp_updateNavigationButtons();
               }, 10);
           }
       }
       
       // Navigate to next image
       function igp_showNextImage() {
           if (igp_currentImageIndex < igp_allImages.length - 1) {
               igp_currentImageIndex++;
               // Clear previous image first
               igp_previewImage.src = '';
               setTimeout(() => {
                   igp_previewImage.src = igp_allImages[igp_currentImageIndex].url;
                   igp_previewTitle.textContent = igp_allImages[igp_currentImageIndex].title;
                   igp_updateNavigationButtons();
               }, 10);
           }
       }
       
       // Update navigation buttons visibility based on current position
       function igp_updateNavigationButtons() {
           igp_prevImageBtn.style.visibility = igp_currentImageIndex <= 0 ? 'hidden' : 'visible';
           igp_nextImageBtn.style.visibility = igp_currentImageIndex >= igp_allImages.length - 1 ? 'hidden' : 'visible';
       }

       // Show the gallery
       function igp_showGallery() { 
           igp_galleryOverlay.style.display = 'block';
           document.body.style.overflow = 'hidden'; // Prevent scrolling the main page
           
           // Clear image loading queue when opening gallery
           igp_imageLoadQueue = [];
           igp_isProcessingQueue = false;
           
           // Initialize or refresh the gallery
           if (igp_allImages.length === 0) {
               igp_loadImages();
           } else {
               // Reset in case the window was resized
               igp_initGallerySizes();
               igp_setupPlaceholder();
               igp_renderVisibleItems(0);
           }
       }

       // Close the gallery
       function igp_closeGallery() {
           igp_galleryOverlay.style.display = 'none';
           document.body.style.overflow = '';
           
           // Clear image loading queue when closing
           igp_imageLoadQueue = [];
           igp_isProcessingQueue = false;
           
           // On mobile devices, clear all image elements to free memory
           if (igp_isMobile) {
               igp_galleryGrid.querySelectorAll('.igp_gallery-item').forEach(item => {
                   // Remove the item from DOM
                   igp_galleryGrid.removeChild(item);
               });
               igp_visibleItems.clear();
           }
       }

       // Handle window resize
       function igp_handleResize() {
           if (igp_galleryOverlay.style.display === 'block') {
               // Clear previous timeout to debounce resize events
               if (window.igp_resizeTimeout) {
                   clearTimeout(window.igp_resizeTimeout);
               }
               
               window.igp_resizeTimeout = setTimeout(() => {
                   // Clear all existing items
                   igp_galleryGrid.querySelectorAll('.igp_gallery-item').forEach(item => {
                       igp_galleryGrid.removeChild(item);
                   });
                   igp_visibleItems.clear();
                   
                   // Recalculate sizes and render
                   igp_initGallerySizes();
                   igp_setupPlaceholder();
                   igp_renderVisibleItems();
                   
                   window.igp_resizeTimeout = null;
               }, 200); // Debounce resize events
           }
       }
	   
	document.addEventListener('DOMContentLoaded', function() {
    // Initialize image cache
       igp_imageCache = new Map();
    
    // Add all event listeners
    igp_showImagesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        igp_showGallery();
    });
    
    igp_closeGalleryBtn.addEventListener('click', igp_closeGallery);
    igp_closeImagePreviewBtn.addEventListener('click', igp_closeImagePreview);
    igp_prevImageBtn.addEventListener('click', igp_showPreviousImage);
    igp_nextImageBtn.addEventListener('click', igp_showNextImage);
    
    // Add mobile-specific touch events
    if (igp_isMobile) {
        igp_showImagesBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            igp_showGallery();
        });
    }
    
    // Use passive event listener for better scroll performance
    igp_galleryContent.addEventListener('scroll', igp_handleScroll, { passive: true });
    
    // Resize handler (with passive option)
    window.addEventListener('resize', igp_handleResize, { passive: true });
    
    // Close gallery when clicking outside the container
    igp_galleryOverlay.addEventListener('click', event => {
        if (event.target === igp_galleryOverlay) {
            igp_closeGallery();
        }
    });
    
    // Close image preview when clicking outside the image
    igp_imagePreviewOverlay.addEventListener('click', event => {
        if (event.target === igp_imagePreviewOverlay) {
            igp_closeImagePreview();
        }
    });
    
    // Handle keyboard events (Escape key, Arrow keys)
    document.addEventListener('keydown', event => {
        if (igp_imagePreviewOverlay.style.display === 'flex') {
            // Image preview is open
            switch (event.key) {
                case 'Escape':
                    igp_closeImagePreview();
                    break;
                case 'ArrowLeft':
                    igp_showPreviousImage();
                    break;
                case 'ArrowRight':
                    igp_showNextImage();
                    break;
            }
        } else if (igp_galleryOverlay.style.display === 'block') {
            // Gallery is open
            if (event.key === 'Escape') {
                igp_closeGallery();
            }
        }
    });
    
});
