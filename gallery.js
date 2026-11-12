// Screenshot gallery: arrow buttons & touch/mouse swipe scroll shots, a tap opens lightbox.
document.querySelectorAll('.gallery').forEach(function (gallery) {
  var track = gallery.querySelector('.shots');
  if (!track) return;
  var prev = gallery.querySelector('.nav-prev');
  var next = gallery.querySelector('.nav-next');

  function step() {
    var first = track.querySelector('figure');
    return first ? first.getBoundingClientRect().width + 20 : 300;
  }
  function update() {
    if (!prev || !next) return;
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }

  if (prev) {
    prev.addEventListener('click', function () {
      track.scrollBy({ left: -step(), behavior: 'smooth' });
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      track.scrollBy({ left: step(), behavior: 'smooth' });
    });
  }

  // Timestamp to suppress lightbox on drag / swipe / scroll
  var lastSwipeTime = 0;
  function markSwiped() {
    lastSwipeTime = Date.now();
  }

  track.addEventListener('scroll', function () {
    update();
    markSwiped();
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Pointer / Mouse Drag Swipe
  var isPointerDown = false;
  var startX = 0;
  var startY = 0;
  var startScrollLeft = 0;
  var startTime = 0;
  var isDragging = false;
  var activePointerId = null;
  var dragThreshold = 6;

  track.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isPointerDown = true;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = track.scrollLeft;
    startTime = Date.now();
    activePointerId = e.pointerId;
  });

  track.addEventListener('pointermove', function (e) {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;

    if (!isDragging) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > dragThreshold) {
        isPointerDown = false;
        return;
      }
      if (Math.abs(dx) > dragThreshold) {
        isDragging = true;
        markSwiped();
        track.classList.add('is-dragging');
        track.style.scrollSnapType = 'none';
        track.style.scrollBehavior = 'auto';
        try {
          track.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }

    if (isDragging) {
      if (e.cancelable) e.preventDefault();
      track.scrollLeft = startScrollLeft - dx;
      markSwiped();
    }
  });

  function endDrag(e) {
    if (!isPointerDown || (e && e.pointerId !== activePointerId)) return;
    isPointerDown = false;

    if (isDragging) {
      track.classList.remove('is-dragging');
      track.style.scrollSnapType = '';
      track.style.scrollBehavior = '';

      var dx = e ? e.clientX - startX : 0;
      var dt = Math.max(1, Date.now() - startTime);
      var vx = dx / dt;
      var s = step();

      if (Math.abs(vx) > 0.25 || Math.abs(dx) > s * 0.22) {
        var direction = dx < 0 ? 1 : -1;
        track.scrollBy({ left: direction * s * 0.9, behavior: 'smooth' });
      }

      try {
        if (e) track.releasePointerCapture(e.pointerId);
      } catch (_) {}

      markSwiped();
    }
    isDragging = false;
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', function (e) {
    markSwiped();
    endDrag(e);
  });

  // Touch swipe fallback for mobile track
  var touchStartX = 0;
  var touchStartY = 0;
  track.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  track.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1) {
      var dx = Math.abs(e.touches[0].clientX - touchStartX);
      var dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 6 && dx > dy) {
        markSwiped();
      }
    }
  }, { passive: true });

  // Prevent browser ghost drag on images
  track.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
  });

  // Lightbox click hook per gallery
  gallery.addEventListener('click', function (e) {
    var shot = (e.target && e.target.tagName === 'IMG' && e.target.closest('.shots figure')) ? e.target : null;
    if (!shot) return;
    if (Date.now() - lastSwipeTime < 300) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    var fig = shot.closest('figure');
    if (window.__openLightbox) {
      window.__openLightbox(gallery, fig);
    }
  }, true);
});

// Centralized Lightbox Controller: Body scroll-lock & swipe navigation
(function () {
  var box = document.querySelector('dialog.lightbox');
  if (!box || typeof box.showModal !== 'function') return;

  var img = box.querySelector('img');
  var cap = box.querySelector('p');
  var activeFigures = [];
  var activeTrack = null;
  var currentIndex = 0;
  var isLightboxOpen = false;

  function showFigure(index, immediate) {
    if (!activeFigures.length) return;
    currentIndex = ((index % activeFigures.length) + activeFigures.length) % activeFigures.length;
    var fig = activeFigures[currentIndex];
    var figImg = fig.querySelector('img');
    var figCap = fig.querySelector('figcaption');
    if (!figImg) return;

    if (immediate) {
      img.src = figImg.src;
      img.alt = figImg.alt;
      cap.innerHTML = figCap ? figCap.innerHTML : '';
      return;
    }

    box.classList.add('is-switching');
    setTimeout(function () {
      img.src = figImg.src;
      img.alt = figImg.alt;
      cap.innerHTML = figCap ? figCap.innerHTML : '';
      box.classList.remove('is-switching');
    }, 80);
  }

  function openLightbox(gallery, figure) {
    activeTrack = gallery.querySelector('.shots');
    activeFigures = Array.from(gallery.querySelectorAll('.shots figure'));
    currentIndex = activeFigures.indexOf(figure);
    if (currentIndex === -1) currentIndex = 0;

    showFigure(currentIndex, true);

    // Lock background scroll completely
    document.documentElement.classList.add('lightbox-open');
    document.body.classList.add('lightbox-open');
    isLightboxOpen = true;

    box.showModal();
  }

  function closeLightbox() {
    if (!isLightboxOpen && !box.open) return;
    box.close();
  }

  function onModalClosed() {
    document.documentElement.classList.remove('lightbox-open');
    document.body.classList.remove('lightbox-open');
    isLightboxOpen = false;

    // Gently align the background track with the active figure
    if (activeTrack && activeFigures[currentIndex]) {
      var targetFig = activeFigures[currentIndex];
      var targetLeft = targetFig.offsetLeft - 16;
      activeTrack.scrollTo({ left: targetLeft, behavior: 'auto' });
    }
  }

  box.addEventListener('close', onModalClosed);
  box.addEventListener('cancel', onModalClosed);

  // Prevent scroll bleed-through on mobile and wheel on desktop
  box.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });

  box.addEventListener('wheel', function (e) {
    e.preventDefault();
  }, { passive: false });

  // Touch Swipe & Tap handling inside Lightbox
  var touchStartX = 0;
  var touchStartY = 0;
  var isTouching = false;
  var touchMoved = false;
  var lastTouchTime = 0;

  box.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    lastTouchTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isTouching = true;
    touchMoved = false;
  }, { passive: true });

  box.addEventListener('touchmove', function (e) {
    if (!isTouching || e.touches.length !== 1) return;
    e.preventDefault();
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchMoved = true;
    }
  }, { passive: false });

  box.addEventListener('touchend', function (e) {
    if (!isTouching) return;
    isTouching = false;
    lastTouchTime = Date.now();

    if (!touchMoved) {
      // Deliberate tap anywhere closes lightbox
      closeLightbox();
      return;
    }

    var touch = e.changedTouches[0];
    if (!touch) return;
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;

    // Horizontal flick -> Prev / Next image
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 36) {
      if (dx < 0) {
        showFigure(currentIndex + 1);
      } else {
        showFigure(currentIndex - 1);
      }
      return;
    }

    // Downward swipe -> Dismiss lightbox
    if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
      closeLightbox();
    }
  }, { passive: true });

  box.addEventListener('touchcancel', function () {
    isTouching = false;
  });

  // Desktop Mouse Drag & Click handling (ignores synthetic touch-generated mouse events)
  var isMouseDown = false;
  var mouseStartX = 0;
  var mouseStartY = 0;
  var mouseMoved = false;

  box.addEventListener('mousedown', function (e) {
    if (Date.now() - lastTouchTime < 500) return;
    if (e.button !== 0) return;
    isMouseDown = true;
    mouseMoved = false;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!isMouseDown || !isLightboxOpen) return;
    var dx = e.clientX - mouseStartX;
    var dy = e.clientY - mouseStartY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      mouseMoved = true;
    }
  });

  window.addEventListener('mouseup', function (e) {
    if (!isMouseDown) return;
    isMouseDown = false;
    if (Date.now() - lastTouchTime < 500) return;

    if (!mouseMoved) {
      closeLightbox();
      return;
    }

    var dx = e.clientX - mouseStartX;
    var dy = e.clientY - mouseStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 36) {
      if (dx < 0) {
        showFigure(currentIndex + 1);
      } else {
        showFigure(currentIndex - 1);
      }
    }
  });

  // Keyboard Navigation: Left/Right arrows change image, Esc closes natively
  window.addEventListener('keydown', function (e) {
    if (!isLightboxOpen) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      showFigure(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showFigure(currentIndex - 1);
    }
  });

  window.__openLightbox = openLightbox;
})();
