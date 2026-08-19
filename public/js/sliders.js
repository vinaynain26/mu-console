// home page event swiper

var swiper = new Swiper(".menaSwipe", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".menaSwipe-next",
    prevEl: ".menaSwipe-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".ugcard1", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".ugcard1-next",
    prevEl: ".ugcard1-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  grabCursor: true, // ✅ Feels more natural on touch
  resistanceRatio: 0.6, // ✅ Smoother resistance effect on edges
  touchStartPreventDefault: false, // ✅ Prevents over-blocking of touch
  speed: 800, // ✅ Global speed, a bit lower for fluid feel

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8, // ✅ Smooth glide
      touchStartPreventDefault: false,
    },

    768: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper = new Swiper(".ugcard2", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".ugcard2-next",
    prevEl: ".ugcard2-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  grabCursor: true, // ✅ Feels more natural on touch
  resistanceRatio: 0.6, // ✅ Smoother resistance effect on edges
  touchStartPreventDefault: false, // ✅ Prevents over-blocking of touch
  speed: 800, // ✅ Global speed, a bit lower for fluid feel

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8, // ✅ Smooth glide
      touchStartPreventDefault: false,
    },

    768: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".ugcard3", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".ugcard3-next",
    prevEl: ".ugcard3-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  grabCursor: true, // ✅ Feels more natural on touch
  resistanceRatio: 0.6, // ✅ Smoother resistance effect on edges
  touchStartPreventDefault: false, // ✅ Prevents over-blocking of touch
  speed: 800, // ✅ Global speed, a bit lower for fluid feel

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8, // ✅ Smooth glide
      touchStartPreventDefault: false,
    },

    768: {
      slidesPerView: 1.1,
      spaceBetween: 16,
      freeMode: true,
      speed: 600,
      momentumRatio: 0.8,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper160 = new Swiper(".sharkSwiperWrapper", {
  slidesPerView: 3,
  centeredSlides: true,
  loopAdditionalSlides: 20,
  initialSlide: 1, // ✅ Start from 2nd slide
  speed: 800,
  loopFillGroupWithBlank: true,
  grabCursor: false,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  effect: "coverflow",
  coverflowEffect: {
    rotate: 0,         // No tilt
    stretch: 0,
    depth: 100,        // 3D distance
    modifier: 1,
    slideShadows: false,
    scale: 1,
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      spaceBetween: 40,
      centeredSlides: true,
    },
    768: {
      slidesPerView: 1.2,
      centeredSlides: true,
    },
    1024: {
      slidesPerView: 4.3,
      centeredSlides: false,
      spaceBetween: 30,
    },
    1366: {
      slidesPerView: 4.3,
      centeredSlides: false,
      spaceBetween: 30,
    },
    1600: {
      slidesPerView: 4.3,
      centeredSlides: false,
      spaceBetween: 30,
    },
  },
});


var swiper = new Swiper(".mastersScrolldsai", {
  // slidesPerView: "auto", // Adjusts dynamically
  centeredSlides: true, // Centers active slide
  spaceBetween: 20,
  loop: true, // Enables infinite loop
  speed: 300, // Smooth transition speed
  autoplay: {
    delay: 400, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".mastersScrolldsai-next",
    prevEl: ".mastersScrolldsai-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 4.5,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4.5,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 5,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".logoSlider", {
  slidesPerView: 1,
  spaceBetween: 20,
  loop: true,
  autoplay: {
    delay: 1500, // Time in ms before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after user interaction
    pauseOnMouseEnter: true, // Pauses autoplay when hovering over the Swiper
  },
  navigation: {
    nextEl: ".logoSlider-next",
    prevEl: ".logoSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newMeetMasterSwiper", {
  slidesPerView: 4.5,
  spaceBetween: 20,
  freeMode: true,

  navigation: {
    nextEl: ".newMeetMasterSwiper-next",
    prevEl: ".newMeetMasterSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.3,
      freeMode: true,
      autoplay: false,
    },

    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 4.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 4.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newMeetMasterSwiper2", {
  slidesPerView: 4.5,
  spaceBetween: 20,
  freeMode: true,

  navigation: {
    nextEl: ".newMeetMasterSwiper-next",
    prevEl: ".newMeetMasterSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.3,
      freeMode: true,
      autoplay: false,
    },

    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 4.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 4.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var menaLandingswiper = new Swiper(".menaLandingswiper", {
  slidesPerView: 3,
  spaceBetween: 20,
  loop: false,
  navigation: {
    nextEl: ".next-pointer",
    prevEl: ".prev-pointer",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper0 = new Swiper(".homePageSwiper", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  speed: 400,
  effect: "fade", // Add this line to enable the fade effect
  fadeEffect: {
    crossFade: true, // Allows the transition between slides to fade smoothly
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".masterSwiper-Next",
    prevEl: ".masterSwiper-Prev",
  },
  autoplay: {
    delay: 400, // Time between transitions in milliseconds
    disableOnInteraction: false, // Autoplay will not stop after interactions
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: true,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".stylesSwiper", {
  slidesPerView: 1,
  speed: 400,
  freeMode: true,
  spaceBetween: 16,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".stylesSwiper-Next",
    prevEl: ".stylesSwiper-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      freeMode: true,
      speed: 400,
    },
    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: true,
      speed: 400,
    },
    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".germanSwiper", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  spaceBetween: 80,
  speed: 400,
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".germanSwiper-Next",
    prevEl: ".germanSwiper-Prev",
  },

  autoplay: {
    delay: 2000, // Time between transitions in milliseconds
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 80,

    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
  },
});

var swiper0 = new Swiper(".germanSwiperTbm", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  spaceBetween: 80,
  speed: 400,
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".germanSwiperTbm-Next",
    prevEl: ".germanSwiperTbm-Prev",
  },

  autoplay: {
    delay: 2000, // Time between transitions in milliseconds
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 80,

    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
  },
});

var swiper0 = new Swiper(".germanSwiperTbmGlobal", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  spaceBetween: 80,
  speed: 400,
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".germanSwiperTbmGlobal-Next",
    prevEl: ".germanSwiperTbmGlobal-Prev",
  },

  autoplay: {
    delay: 2000, // Time between transitions in milliseconds
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 80,

    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 80,

    },
  },
});






var swiper0 = new Swiper(".masterSwiper2", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  speed: 400,

  autoplay: {
    delay: 1200,
    disableOnInteraction: true,
  },
  navigation: {
    nextEl: ".masterSwiper2-Next",
    prevEl: ".masterSwiper2-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: true,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".swiperPodcast", {
  slidesPerView: 1,
  freeMode: true,
  spaceBetween: 20,
  loop: true,
  speed: 300,
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".swiperPodcast-Next",
    prevEl: ".swiperPodcast-Prev",
  },

  autoplay: {
    delay: 2500, // Time between transitions in milliseconds
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 300,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 300,
    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".pgphome2", {
  slidesPerView: 2.3,
  spaceBetween: 20,
  freeMode: true,
  speed: 400,
  navigation: {
    nextEl: ".pgphome2-Next",
    prevEl: ".pgphome2-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,

      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.6,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});
var swiper0 = new Swiper(".pgphome", {
  slidesPerView: 2.3,
  spaceBetween: 20,
  freeMode: true,
  speed: 400,
  navigation: {
    nextEl: ".pgphome-Next",
    prevEl: ".pgphome-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,

      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var menaSwiper1 = new Swiper(".menaSlider1", {
  slidesPerView: 2.3,
  spaceBetween: 20,
  freeMode: true,
  speed: 400,
  navigation: {
    nextEl: ".menaSlider1-Next",
    prevEl: ".menaSlider1-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,

      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var menaSwiper2 = new Swiper(".menaSlider2", {
  slidesPerView: 2.3,
  spaceBetween: 20,
  freeMode: true,
  speed: 400,
  navigation: {
    nextEl: ".menaSlider2-Next",
    prevEl: ".menaSlider2-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,

      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var menaSwiper3 = new Swiper(".menaSlider3", {
  slidesPerView: 2.3,
  spaceBetween: 20,
  freeMode: true,
  speed: 400,
  navigation: {
    nextEl: ".menaSlider3-Next",
    prevEl: ".menaSlider3-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,

      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.4,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".pgphome3", {
  slidesPerView: 2.4,
  spaceBetween: 20,
  speed: 400,
  navigation: {
    nextEl: ".pgphome3-Next",
    prevEl: ".pgphome3-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.6,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".studentLifeCampusSlider", {
  speed: 400,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  autoplay: {
    delay: 1200,
    disableOnInteraction: false,
  },
  effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
});

var swiper0 = new Swiper(".commonAreaWrap", {
  slidesPerView: 1,
  spaceBetween: 2,
  speed: 400,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  autoplay: {
    delay: 1000,
    disableOnInteraction: false,
  },

  effect: "fade",
  fadeEffect: {
    crossFade: true,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: true,
      speed: 300,
    },

    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1920: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".studentBusinessClub", {
  slidesPerView: 1.1,
  spaceBetween: 5,
  speed: 400,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  autoplay: {
    delay: 1200,
    disableOnInteraction: false,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 10,
    },

    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 10,
    },

    1440: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1920: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 10,
    },
  },
});



var swiper1 = new Swiper(".alumniSpotlight", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".alumniSpotlight-Next",
    prevEl: ".alumniSpotlight-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper1 = new Swiper(".internshipSwiper", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiper-Next",
    prevEl: ".internshipSwiper-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper1 = new Swiper(".internshipSwiperClassPsm", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiperClassPsm-Next",
    prevEl: ".internshipSwiperClassPsm-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper1 = new Swiper(".internshipSwiperClassCareer", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiperClassCareer-Next",
    prevEl: ".internshipSwiperClassCareer-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});



var swiper1 = new Swiper(".internshipSwiperTbm", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiperTbm-Next",
    prevEl: ".internshipSwiperTbm-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});



var swiper01 = new Swiper(".internshipSwiperClass", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiperClass-Next",
    prevEl: ".internshipSwiperClass-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper = new Swiper(".internshipSwiperClass3", {
  slidesPerView: 1,
  spaceBetween: 0,
  // effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 0,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".internshipSwiperClass3-Next",
    prevEl: ".internshipSwiperClass3-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
      spaceBetween: 30,
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      allowTouchMove: false,
      spaceBetween: 30,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper1 = new Swiper(".alumniSpotlight2", {
  slidesPerView: 1,
  spaceBetween: 0,
  effect: "fade",
  fadeEffect: {
    crossFade: true,
  },
  freeMode: false,
  loop: false,
  speed: 300,
  allowTouchMove: false, // 👈 THIS disables dragging/swiping

  navigation: {
    nextEl: ".alumniSpotlight2-Next",
    prevEl: ".alumniSpotlight2-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false, // 👈 Add this inside each breakpoint too
    },
    680: {
      slidesPerView: 1.2,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false,
    },
    768: {
      slidesPerView: 1,
      freeMode: false,
      autoplay: false,
      speed: 400,
      allowTouchMove: false,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      allowTouchMove: false,
    },
  },
});

var swiper2 = new Swiper(".alumniSpotlightIntersect", {
  slidesPerView: 1,
  spaceBetween: 0,
  effect: "fade",
  fadeEffect: {
    // added
    crossFade: true, // added(resolve the overlapping of the slides)
  }, // added
  freeMode: true,
  loop: false,
  speed: 300,
  navigation: {
    nextEl: ".alumniSpotlightIntersect-Next",
    prevEl: ".alumniSpotlightIntersect-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      draggable: true,
      autoplay: false,
      speed: 400,
    },

    680: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper1 = new Swiper(".intheNewsSlider", {
  slidesPerView: 1,
  spaceBetween: 24,
  freeMode: true,
  loop: false,
  speed: 300,
  navigation: {
    nextEl: ".intheNewsSlider-Next",
    prevEl: ".intheNewsSlider-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      draggable: true,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});


var swiper2 = new Swiper(".studenteventslide", {
  slidesPerView: 1.2,
  spaceBetween: 25,
  parallax: false,
  loop: false,
  speed: 400,
  freeMode: false,
  navigation: {
    nextEl: ".studenteventslide-Next",
    prevEl: ".studenteventslide-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.7,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper3 = new Swiper(".innovationSlider", {
  slidesPerView: 3,
  spaceBetween: 25,
  parallax: false,
  loop: false,
  speed: 400,
  freeMode: false,
  navigation: {
    nextEl: ".innovationSlider-Next",
    prevEl: ".innovationSlider-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1280: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper4 = new Swiper(".innovationSlider2", {
  slidesPerView: 3,
  spaceBetween: 25,
  parallax: false,
  loop: false,
  speed: 400,
  freeMode: false,
  navigation: {
    nextEl: ".innovationSlider2-Next",
    prevEl: ".innovationSlider2-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});



var swiper5 = new Swiper(".redefine-swiper", {
  slidesPerView: 1,
  spaceBetween: 0,
  loop: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".redefine-next",
    prevEl: ".redefine-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper6 = new Swiper(".storyswiper", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 300,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper-next",
    prevEl: ".storyswiper-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper7 = new Swiper(".storyswiper1", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper1-next",
    prevEl: ".storyswiper1-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var storyswiper1a = new Swiper(".storyswiper1a", {
  // slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper1a-next",
    prevEl: ".storyswiper1a-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var storyswiper1b = new Swiper(".storyswiper1b", {
  // slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper1b-next",
    prevEl: ".storyswiper1b-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var globalSwiper1 = new Swiper(".globalSwiper1", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".globalSwiper1-next",
    prevEl: ".globalSwiper1-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    400: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var tbmFbmSwiper = new Swiper(".tbmFbmSwiper", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".tbmFbmSwiper-next",
    prevEl: ".tbmFbmSwiper-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    400: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var tbmFbmSwiper2new = new Swiper(".tbmFbmSwiper2new", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".tbmFbmSwiper2new-next",
    prevEl: ".tbmFbmSwiper2new-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    400: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper22 = new Swiper(".panelistIntersect", {
  slidesPerView: 1.3,
  spaceBetween: 20,

  navigation: {
    nextEl: ".panelistIntersect-next",
    prevEl: ".panelistIntersect-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 2.9,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper8 = new Swiper(".storyswiper2", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper2-next",
    prevEl: ".storyswiper2-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.9,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper9 = new Swiper(".storyswiper3", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper3-next",
    prevEl: ".storyswiper3-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1280: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper10 = new Swiper(".storyswiper4", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper4-next",
    prevEl: ".storyswiper4-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper11 = new Swiper(".storyswiper5", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper5-next",
    prevEl: ".storyswiper5-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper12 = new Swiper(".storyswiper6", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".storyswiper6-next",
    prevEl: ".storyswiper6-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper14 = new Swiper(".hrinsight", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".hrinsight-next",
    prevEl: ".hrinsight-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

// center swiper home

var swiper15 = new Swiper(".cohortswiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  centeredSlides: true,

  navigation: {
    nextEl: ".s-next",
    prevEl: ".s-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper20 = new Swiper(".unfoldSwiper", {
  slidesPerView: 2.4,
  spaceBetween: 20,
  centeredSlides: true,
  initialSlide: 1,
  navigation: {
    nextEl: ".unfoldSwiper-next",
    prevEl: ".unfoldSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper20 = new Swiper(".networkingParent", {
  slidesPerView: 2.4,
  spaceBetween: 20,
  centeredSlides: true,
  initialSlide: 1,

  breakpoints: {
    0: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper21 = new Swiper(".dropshippingSwiper", {
  slidesPerView: 2.5,
  spaceBetween: 280,
  centeredSlides: true,
  initialSlide: 1,
  navigation: {
    nextEl: ".dropshippingSwiper-next",
    prevEl: ".dropshippingSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper22 = new Swiper(".mobSwiper", {
  slidesPerView: 1.3,
  spaceBetween: 60,
  centeredSlides: true,
  initialSlide: 1,
  navigation: {
    nextEl: ".mobSwiper-next",
    prevEl: ".mobSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper23 = new Swiper(".spotlightSwiper", {
  slidesPerView: 3.1,
  spaceBetween: 60,
  centeredSlides: true,
  initialSlide: 1,
  navigation: {
    nextEl: ".spotlightSwiper-next",
    prevEl: ".spotlightSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper24 = new Swiper(".hrSwiper", {
  slidesPerView: 2.3,
  spaceBetween: 60,
  //centeredSlides: true,
  //initialSlide: 1,
  navigation: {
    nextEl: ".hrSwiper-next",
    prevEl: ".hrSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper26 = new Swiper(".unwindInteraction", {
  slidesPerView: 1,
  spaceBetween: 20,
  //centeredSlides: true,
  //initialSlide: 1,
  navigation: {
    nextEl: ".unwindInteraction-next",
    prevEl: ".unwindInteraction-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.8,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.3,
    },
  },
});

var swiper27 = new Swiper(".studentSlide", {
  slidesPerView: 1,
  spaceBetween: 60,
  centeredSlides: true,
  // initialSlide: 1,
  navigation: {
    nextEl: ".studentSlide-Next",
    prevEl: ".studentSlide-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper28 = new Swiper(".sucessstory", {
  slidesPerView: 1,
  freeMode: true,

  spaceBetween: 60,
  navigation: {
    nextEl: ".sucessstory-Next",
    prevEl: ".sucessstory-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper29 = new Swiper(".elevateskill", {
  slidesPerView: 1,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".elevateskill-Next",
    prevEl: ".elevateskill-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 500,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      speed: 500,
    },
    1024: {
      slidesPerView: 3.5,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      spaceBetween: 20,
    },
  },
});

var swiper30 = new Swiper(".facultyresearch", {
  slidesPerView: 1,
  spaceBetween: 60,
  freeMode: true,
  navigation: {
    nextEl: ".facultyresearch-Next",
    prevEl: ".facultyresearch-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.5,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      slidesPerGroup: 1,
      spaceBetween: 50,
    },
    1600: {
      slidesPerView: 2.5,
      spaceBetween: 20,
    },
  },
});

var swiper31 = new Swiper(".demodaySwiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".demodaySwiper-Next",
    prevEl: ".demodaySwiper-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper32 = new Swiper(".eventheld", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld-Next",
    prevEl: ".eventheld-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.4,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 2.7,
    },
  },
});

var swiper25 = new Swiper(".eventheld1", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld1-Next",
    prevEl: ".eventheld1-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper35 = new Swiper(".eventheld2", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld2-Next",
    prevEl: ".eventheld2-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper36 = new Swiper(".eventheld3", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld3-Next",
    prevEl: ".eventheld3-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper37 = new Swiper(".eventheld4", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld4-Next",
    prevEl: ".eventheld4-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper38 = new Swiper(".eventheld5", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld5-Next",
    prevEl: ".eventheld5-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper39 = new Swiper(".eventheld6", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld6-Next",
    prevEl: ".eventheld6-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper40 = new Swiper(".eventheld7", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld7-Next",
    prevEl: ".eventheld7-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld8", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld8-Next",
    prevEl: ".eventheld8-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld9", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld9-Next",
    prevEl: ".eventheld9-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld10", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld10-Next",
    prevEl: ".eventheld10-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld11", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld11-Next",
    prevEl: ".eventheld11-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld12", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld12-Next",
    prevEl: ".eventheld12-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld13", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld13-Next",
    prevEl: ".eventheld13-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper40 = new Swiper(".eventheld14", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld14-Next",
    prevEl: ".eventheld14-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld15", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld15-Next",
    prevEl: ".eventheld15-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld16", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld16-Next",
    prevEl: ".eventheld16-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld17", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld17-Next",
    prevEl: ".eventheld17-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld18", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld18-Next",
    prevEl: ".eventheld18-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld19", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld19-Next",
    prevEl: ".eventheld19-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld20", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld20-Next",
    prevEl: ".eventheld20-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld21", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld21-Next",
    prevEl: ".eventheld21-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld22", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld22-Next",
    prevEl: ".eventheld22-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld23", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld23-Next",
    prevEl: ".eventheld23-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper40 = new Swiper(".eventheld24", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".eventheld24-Next",
    prevEl: ".eventheld24-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var uniwnd = new Swiper(".unwind", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".unwind-Next",
    prevEl: ".unwind-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.4,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.4,
    },
  },
});

var uniwnd = new Swiper(".unwind2", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".unwind2-Next",
    prevEl: ".unwind2-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3,
    },
  },
});

var uniwnd = new Swiper(".unwind1", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".unwind1-Next",
    prevEl: ".unwind1-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.2,
    },
  },
});

var swiper33 = new Swiper(".fununfold", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".fununfold-Next",
    prevEl: ".fununfold-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.4,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 3.4,
    },
  },
});

var swiper34 = new Swiper(".centeredSwiper5", {
  slidesPerView: 1,
  spaceBetween: 25,
  freeMode: true,
  navigation: {
    nextEl: ".centeredSwiper5-Next",
    prevEl: ".centeredSwiper5-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newsSlide2", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newsSlide2-next",
    prevEl: ".newsSlide2-prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".curriculumdsai", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".curriculumdsai-next",
    prevEl: ".curriculumdsai-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 200,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 200,
    },

    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".highlightdsai", {
  slidesPerView: 2.5,
  spaceBetween: 15,

  navigation: {
    nextEl: ".highlightdsai-next",
    prevEl: ".highlightdsai-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 500,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 500,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
    },
  },
});

var highlightdsai2 = new Swiper(".highlightdsai2", {
  slidesPerView: 2.5,
  spaceBetween: 15,

  navigation: {
    nextEl: ".highlightdsai2-next",
    prevEl: ".highlightdsai2-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 500,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 500,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
    },
  },
});

var swiper = new Swiper(".intersectFiveSwiper", {
  slidesPerView: 3,
  spaceBetween: 20,

  navigation: {
    nextEl: ".intersectFiveSwiper-next",
    prevEl: ".intersectFiveSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 500,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 500,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper1 = new Swiper(".voiceSwiper1", {
  slidesPerView: 3,
  spaceBetween: 20,

  navigation: {
    nextEl: ".voiceSwiper1-next",
    prevEl: ".voiceSwiper1-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper2 = new Swiper(".voiceSwiper2", {
  slidesPerView: 3,
  spaceBetween: 20,

  navigation: {
    nextEl: ".voiceSwiper2-next",
    prevEl: ".voiceSwiper2-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".intersectEventSwiper", {
  slidesPerView: 3,
  spaceBetween: 20,

  navigation: {
    nextEl: ".intersectEventSwiper-next",
    prevEl: ".intersectEventSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 2.2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 2.2,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".techIndustryImmersion", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".techIndustryImmersion-next",
    prevEl: ".techIndustryImmersion-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var corpSlider = new Swiper(".psy-corporateSlider", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".psy-corporateSlider-next",
    prevEl: ".psy-corporateSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".weekendSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 20,

  navigation: {
    nextEl: ".weekendSwiper-next",
    prevEl: ".weekendSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".LeaderSliderSummerSkill", {
  slidesPerView: 5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".LeaderSlider-next",
    prevEl: ".LeaderSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".nextGenSlider", {
  slidesPerView: 5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".nextGenSlider-next",
    prevEl: ".nextGenSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".LeaderSlider", {
  slidesPerView: 5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".LeaderSlider-next",
    prevEl: ".LeaderSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

// var swiper = new Swiper(".LeaderSliderMentors", {
//   slidesPerView: 5,
//   spaceBetween: 20,

//   navigation: {
//     nextEl: ".LeaderSliderMentors-next",
//     prevEl: ".LeaderSliderMentors-prev",
//   },
//   breakpoints: {
//     0: {
//       slidesPerView: 1.5,
//       freeMode: true,
//       autoplay: false,
//       speed: 400,
//       spaceBetween: 20,
//     },

//     768: {
//       slidesPerView: 1.8,
//       freeMode: true,
//       autoplay: false,
//       speed: 400,
//     },
//     1024: {
//       slidesPerView: 3,
//       freeMode: false,
//       slidesPerGroup: 1,
//     },
//     1366: {
//       slidesPerView: 4,
//       freeMode: false,
//       slidesPerGroup: 1,
//       spaceBetween: 20,
//     },
//     1440: {
//       slidesPerView: 5,
//       freeMode: false,
//       slidesPerGroup: 1,
//       spaceBetween: 20,
//     },
//     1600: {
//       slidesPerView: 5,
//       freeMode: false,
//       spaceBetween: 20,
//     },
//   },
// });

var swipermena = new Swiper(".LeaderSliderMenaLanding", {
  slidesPerView: 5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".LeaderSliderMenaLanding-next",
    prevEl: ".LeaderSliderMenaLanding-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".LeaderstudentSlider", {
  slidesPerView: 4,
  spaceBetween: 20,

  navigation: {
    nextEl: ".LeaderstudentSlider-next",
    prevEl: ".LeaderstudentSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper = new Swiper(".summerWeekSlider", {
  slidesPerView: 4,
  spaceBetween: 20,

  navigation: {
    nextEl: ".summerWeekSlider-next",
    prevEl: ".summerWeekSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.4,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".psyAlmuniSwiper", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".psyAlmuniSwiper-next",
    prevEl: ".psyAlmuniSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newsSlide3", {
  slidesPerView: 2.5,
  spaceBetween: 20,
  navigation: {
    nextEl: ".newsSlide3-next",
    prevEl: ".newsSlide3-prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".historicSwiper", {
  slidesPerView: 1,
  spaceBetween: 20,

  loop: true,                // infinite loop ON
  allowSlidePrev: false,     // disable left movement (only right direction)

  autoplay: {
    delay: 1500,
    disableOnInteraction: false,
  },

  navigation: {
    nextEl: ".historicSwiper-next",
    prevEl: ".historicSwiper-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 1,
      freeMode: true,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".historicSwiper2", {
  slidesPerView: 1,
  spaceBetween: 20,

  loop: true,                // infinite loop ON
  allowSlidePrev: false,     // disable left movement (only right direction)

  autoplay: {
    delay: 1500,
    disableOnInteraction: false,
  },

  navigation: {
    nextEl: ".historicSwiper2-next",
    prevEl: ".historicSwiper2-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 1,
      freeMode: true,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".historicSwiper3", {
  slidesPerView: 1,
  spaceBetween: 20,

  loop: true,                // infinite loop ON
  allowSlidePrev: false,     // disable left movement (only right direction)

  autoplay: {
    delay: 1500,
    disableOnInteraction: false,
  },

  navigation: {
    nextEl: ".historicSwiper3-next",
    prevEl: ".historicSwiper3-prev",
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 1,
      freeMode: true,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newslide5", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newslide5-next",
    prevEl: ".newslide5-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newsSlide6", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newsSlide6-next",
    prevEl: ".newsSlide6-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newsSlide7", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newsSlide7-next",
    prevEl: ".newsSlide7-prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".newsSlide8", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newsSlide8-next",
    prevEl: ".newsSlide8-prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".mastersScrollTbm", {
  slidesPerView: "auto", // Adjusts dynamically
  // centeredSlides: true, // Centers active slide
  spaceBetween: 20,
  loop: true, // Enables infinite loop
  autoplay: {
    delay: 1500, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    // pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".mastersScrollTbm-next",
    prevEl: ".mastersScrollTbm-prev",
  },
  freeMode: true, // Enables free mode for smooth scrolling
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      spaceBetween: 15,
      autoplay: false,
      loop: false,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 15,
      autoplay: false,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4.7,
      spaceBetween: 20,
    },

    1920: {
      slidesPerView: 4.8,
      spaceBetween: 20,
    },
  },
});

var swiperM = new Swiper(".mastersScrollCurriculum", {
  slidesPerView: "auto", // Adjusts dynamically
  // centeredSlides: true, // Centers active slide
  spaceBetween: 20,
  loop: true, // Enables infinite loop
  autoplay: {
    delay: 400, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    // pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".mastersScrollCurriculum-next",
    prevEl: ".mastersScrollCurriculum-prev",
  },
  freeMode: true, // Enables free mode for smooth scrolling
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      spaceBetween: 15,
      autoplay: false,
      loop: false,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 15,
      autoplay: false,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 4.7,
      spaceBetween: 20,
    },

    1920: {
      slidesPerView: 5,
      spaceBetween: 20,
    },
  },
});

// temperory slider
var experienceMasterSlider = new Swiper(".itTheNews", {
  slidesPerView: 1,
  spaceBetween: 10,
  speed: 2000,
  navigation: {
    nextEl: ".itTheNews-Next",
    prevEl: ".itTheNews-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var singleEvSlider = new Swiper(".highlight-swiper", {
  slidesPerView: 4,
  spaceBetween: 15,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".highlight-swiper-Next",
    prevEl: ".highlight-swiper-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.2,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var singleEvSlider = new Swiper(".highlight-swiper1", {
  slidesPerView: 4,
  spaceBetween: 15,
  loop: false,
  parallax: true,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".highlight-swiper1-Next",
    prevEl: ".highlight-swiper1-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var singleEvSlider = new Swiper(".researchSwiper", {
  slidesPerView: 4,
  spaceBetween: 15,
  loop: false,
  parallax: true,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".highlight-swiper1-Next",
    prevEl: ".highlight-swiper1-Prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.4,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 25,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

// temperory slider end

// HSSL Event Slider Start

var highSchoolSlider = new Swiper(".highSchoolSlider", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 500,
  navigation: {
    nextEl: ".highSchoolSlider-next",
    prevEl: ".highSchoolSlider-prev",
    clickable: true,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2.1,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var highSchoolPreviousSlider = new Swiper(".highSchoolPreviousSlider", {
  slidesPerView: 3,
  spaceBetween: 15,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".highSchoolPreviousSlider-next",
    prevEl: ".highSchoolPreviousSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      slidesPerGroup: 1,
    },
    768: {
      slidesPerView: 3,
      slidesPerGroup: 1,
    },
    1024: {
      slidesPerView: 4.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var StudentProfileSwiper = new Swiper(".StudentProfileSwiper", {
  slidesPerView: 3,
  spaceBetween: 15,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".StudentProfileSwiper-next",
    prevEl: ".StudentProfileSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      slidesPerGroup: 1,
    },
    768: {
      slidesPerView: 3,
      slidesPerGroup: 1,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

// HSSL Event Slider End

var swiper = new Swiper(".newslide1", {
  slidesPerView: 3,
  spaceBetween: 20,
  navigation: {
    nextEl: ".newslide1-next",
    prevEl: ".newslide1-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper = new Swiper(".newslide2", {
  slidesPerView: 5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".newslide2-next",
    prevEl: ".newslide2-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.6,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.6,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

// Challenges Page Sliders Start

var DropshippingSlider = new Swiper(".DropshippingSlider", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".DropshippingSlider-next",
    prevEl: ".DropshippingSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var ronitSwiper = new Swiper(".ronitSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".ronitSwiper-next",
    prevEl: ".ronitSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var studentChallengeSwiper = new Swiper(".studentChallengeSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".studentChallengeSwiper-next",
    prevEl: ".studentChallengeSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var madhusSwiper = new Swiper(".madhusSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".madhusSwiper-next",
    prevEl: ".madhusSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var arialSwiper = new Swiper(".arialSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".arialSwiper-next",
    prevEl: ".arialSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var ContentcreatorSlider = new Swiper(".challengeSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  parallax: true,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 2000,
  freeMode: true,
  navigation: {
    nextEl: ".challengeSwiper-next",
    prevEl: ".challengeSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var rajikSwiper = new Swiper(".rajikSwiper", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  parallax: true,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 2000,
  freeMode: true,
  navigation: {
    nextEl: ".rajikSwiper-next",
    prevEl: ".rajikSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var wildConsulting = new Swiper(".wildConsulting", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  parallax: true,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 2000,
  freeMode: true,
  navigation: {
    nextEl: ".wildConsulting-next",
    prevEl: ".wildConsulting-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var ventureProgram = new Swiper(".ventureProgram", {
  slidesPerView: 4,
  spaceBetween: 20,
  loop: false,
  parallax: true,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 2000,
  freeMode: true,
  navigation: {
    nextEl: ".ventureProgram-next",
    prevEl: ".ventureProgram-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      speed: 500,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 1.5,
      spaceBetween: 15,
      speed: 500,
    },
    640: {
      slidesPerView: 2.5,
      spaceBetween: 10,
      speed: 500,
    },
    768: {
      slidesPerView: 2,
      spaceBetween: 10,
      speed: 500,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 20,
      slidesPerGroup: 1,
      freeMode: false,
    },
  },
});

var insta_slider = new Swiper(".insta_slider", {
  slidesPerView: 4,
  spaceBetween: 120,
  loop: false,
  parallax: true,
  loop: false,
  freeMode: true,
  mousewheel: false,
  speed: 2000,
  freeMode: true,
  navigation: {
    nextEl: ".insta_slider-next",
    prevEl: ".insta_slider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      speed: 500,
      spaceBetween: 10,
      freeMode: true,
    },
    400: {
      slidesPerView: 1.2,
      spaceBetween: 10,
      speed: 500,
      freeMode: true,
    },
    640: {
      slidesPerView: 5,
      spaceBetween: 30,
      speed: 500,
      freeMode: true,
      loop: true,
    },
    768: {
      slidesPerView: 2.5,
      spaceBetween: 20,
      speed: 500,
      freeMode: true,
    },

    1024: {
      slidesPerView: 3,
      spaceBetween: 20,
      slidesPerGroup: 2,
      freeMode: false,
    },
    1366: {
      slidesPerView: 4,
      spaceBetween: 10,
      slidesPerGroup: 2,
      freeMode: false,
    },
  },
});

// Challenges Page Sliders End

var corpSlider = new Swiper(".psy-corporateSlider", {
  slidesPerView: 2.5,
  spaceBetween: 20,

  navigation: {
    nextEl: ".psy-corporateSlider-next",
    prevEl: ".psy-corporateSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var shareEventSlider = new Swiper(".shareEventSlider", {
  slidesPerView: 3,
  spaceBetween: 25,
  loop: false,
  // mousewheel: true,
  speed: 400,
  freeMode: true,

  breakpoints: {
    0: {
      slidesPerView: 4.4,
      slidesPerGroup: 1,
      freeMode: true,
      spaceBetween: 15,
    },
    400: {
      slidesPerView: 4.4,
      slidesPerGroup: 1,
      freeMode: true,
      spaceBetween: 15,
    },
    768: {
      slidesPerView: 4.4,
      slidesPerGroup: 1,
      freeMode: true,
      spaceBetween: 15,
    },
    1024: {
      slidesPerView: 4.1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 15,
    },
    1366: {
      slidesPerView: 4.4,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 15,
    },
  },
});

var swiper = new Swiper(".sneakPeakSwiperSlider", {
  slidesPerView: 1.3,
  spaceBetween: 20,
  loop: false,
  speed: 400,
  freeMode: true,

  navigation: {
    nextEl: ".sneakPeak-next",
    prevEl: ".sneakPeak-prev",
  },

  breakpoints: {
    400: {
      slidesPerView: 1.3,
      slidesPerGroup: 1,
      freeMode: true,
      spaceBetween: 15,
    },

    768: {
      slidesPerView: 2.5,
      slidesPerGroup: 1,
      freeMode: true,
      spaceBetween: 15,
    },
    1024: {
      slidesPerView: 4.1,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 15,
    },
    1366: {
      slidesPerView: 4.4,
      freeMode: true,
      slidesPerGroup: 1,
      spaceBetween: 15,
    },
  },
});

var swiper = new Swiper(".swiperSpeakersNew", {
  slidesPerView: 1.2,
  loop: false,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,

  navigation: {
    nextEl: ".sneakSpeaker-next",
    prevEl: ".sneakSpeaker-prev",
  },

  breakpoints: {
    400: {
      slidesPerView: 1.2,
      slidesPerGroup: 1,
      freeMode: true,
    },

    768: {
      slidesPerView: 2.2,
      slidesPerGroup: 1,
      freeMode: true,
    },
    1024: {
      slidesPerView: 3,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 5,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

//  get prepped swiper

var swiper = new Swiper(".consultSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".consultSlider-Next",
    prevEl: ".consultSlider-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".productSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".productSlider-Next",
    prevEl: ".productSlider-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".uginthenews", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".uginthenews-Next",
    prevEl: ".uginthenews-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".uginthenewsDsai", {
  slidesPerView: 1.2,
  spaceBetween: 15,
  freeMode: true,
  navigation: {
    nextEl: ".uginthenewsDsai-Next",
    prevEl: ".uginthenewsDsai-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.8,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.5,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".insightSwiper", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwiper-Next",
    prevEl: ".insightSwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiper1", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiper1-Next",
    prevEl: ".outclassSwiper1-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiper2", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiper2-Next",
    prevEl: ".outclassSwiper2-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiper3", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiper3-Next",
    prevEl: ".outclassSwiper3-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiper4", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiper4-Next",
    prevEl: ".outclassSwiper4-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperTbm1", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperTbm1-Next",
    prevEl: ".outclassSwiperTbm1-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperTbm2", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperTbm2-Next",
    prevEl: ".outclassSwiperTbm2-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperTbm3", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperTbm3-Next",
    prevEl: ".outclassSwiperTbm3-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperTbm4", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperTbm4-Next",
    prevEl: ".outclassSwiperTbm4-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 2,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperGlobalTbm4", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperGlobalTbm4-Next",
    prevEl: ".outclassSwiperGlobalTbm4-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperPsm1", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperPsm1-Next",
    prevEl: ".outclassSwiperPsm1-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".outclassSwiperPsm2", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperPsm2-Next",
    prevEl: ".outclassSwiperPsm2-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperPsm3", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperPsm3-Next",
    prevEl: ".outclassSwiperPsm3-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".outclassSwiperPsm4", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".outclassSwiperPsm4-Next",
    prevEl: ".outclassSwiperPsm4-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".ourProgramSwiper", {
  spaceBetween: 10,
  navigation: {
    nextEl: ".ourProgramSwiper-Next",
    prevEl: ".ourProgramSwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 2.3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".studentStoryTBm", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".studentStoryTBm-Next",
    prevEl: ".studentStoryTBm-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});





var swiper = new Swiper(".insightSwiperCurriculum", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwiperCurriculum-Next",
    prevEl: ".insightSwiperCurriculum-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".insightSwipertbmCurriculum ", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwipertbmCurriculum-Next",
    prevEl: ".insightSwipertbmCurriculum-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".insightSwipertbm", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwipertbm-Next",
    prevEl: ".insightSwipertbm-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 1500,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});





var swiper = new Swiper(".tbmFacultySwiper", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".tbmFacultySwiper-Next",
    prevEl: ".tbmFacultySwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".hrosFacultySwiper", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".hrosFacultySwiper-Next",
    prevEl: ".hrosFacultySwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});





var swiper = new Swiper(".tbmFacultySwiperPgp", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".tbmFacultySwiperPgp-Next",
    prevEl: ".tbmFacultySwiperPgp-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".hrOsSwiper", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".hrOsSwiper-Next",
    prevEl: ".hrOsSwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".tbmFacultyGlobalSwiper", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".tbmFacultyGlobalSwiper-Next",
    prevEl: ".tbmFacultyGlobalSwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".insightSwiperAdmission", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwiperAdmission-Next",
    prevEl: ".insightSwiperAdmission-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0.1: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});



var swiper = new Swiper(".insightSwiperClass", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwiperClass-Next",
    prevEl: ".insightSwiperClass-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".insightSwiperClassTbm", {
  spaceBetween: 15,
  navigation: {
    nextEl: ".insightSwiperClassTbm-Next",
    prevEl: ".insightSwiperClassTbm-Prev",
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});
var swiper = new Swiper(".hearFromAlumni", {
  slidesPerView: 1,
  spaceBetween: 20,
  freeMode: true,

  navigation: {
    nextEl: ".hearFromAlumni-next",
    prevEl: ".hearFromAlumni-prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".marketingSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".marketingSlider-Next",
    prevEl: ".marketingSlider-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".financeSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".financeSlider-Next",
    prevEl: ".financeSlider-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".homeDsaiSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".homeDsaiSlider-Next",
    prevEl: ".homeDsaiSlider-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".teachingSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".vhomeAlumniSwiper-Next",
    prevEl: ".vhomeAlumniSwiper-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".vAlumniSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".vAlumniSwiper-Next",
    prevEl: ".vAlumniSwiper-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".intersectLeaderSlider", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: false,
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.8,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 12,
    },
    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 12,
    },
    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 12,
    },
  },
});

var swiper = new Swiper(".teachingSwiper1", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".teachingBtn-Next",
    prevEl: ".teachingBtn-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper8 = new Swiper(".experienceWorld", {
  slidesPerView: 1,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".experienceWorld-next",
    prevEl: ".experienceWorld-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var swiper8 = new Swiper(".mentorsTest", {
  slidesPerView: 1,
  spaceBetween: 10,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".mentorsTest-next",
    prevEl: ".mentorsTest-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    768: {
      slidesPerView: 2.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var tracksSimulationSwiper = new Swiper(".tracksSimulationSwiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  speed: 400,
  navigation: {
    nextEl: ".tracksSimulationSwiper-next",
    prevEl: ".tracksSimulationSwiper-prev",
  },
  pagination: {
    el: ".tracksSimulationSwiper-pagination",
    clickable: true,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      spaceBetween: 16,
    },
    768: {
      slidesPerView: 2.1,
      freeMode: true,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".skillSlider", {
  slidesPerView: 1,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".skillSlider-next",
    prevEl: ".skillSlider-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".businessesBuilt", {
  slidesPerView: 1,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".businessesBuilt-next",
    prevEl: ".businessesBuilt-prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 4,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});

var businesSlider = new Swiper(".businesSlider", {
  slidesPerView: 1,
  spaceBetween: 20,
  speed: 400,
  freeMode: true,
  navigation: {
    nextEl: ".businesSlider-next",
    prevEl: ".businesSlider-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 2.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1440: {
      slidesPerView: 2.1,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
  },
});



var swiper0 = new Swiper(".sharkTank", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  // speed: 400,
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".sharkTank-Next",
    prevEl: ".sharkTank-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 4,
      freeMode: true,
      slidesPerGroup: 4,
    },

    1440: {
      slidesPerView: 4,
      freeMode: true,
      slidesPerGroup: 4,
    },
    1600: {
      slidesPerView: 4,
      freeMode: true,
      slidesPerGroup: 4,
    },
    1920: {
      slidesPerView: 4,
      freeMode: true,
      slidesPerGroup: 4,
    },
  },
});



var swiper0 = new Swiper(".masterSwiper12", {
  slidesPerView: 1,
  freeMode: true,
  loop: true,
  // speed: 400,
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".swiper-pagination", // Add this line to specify the pagination element
    clickable: true, // Allow the pagination bullets to be clickable
  },
  navigation: {
    nextEl: ".masterSwiper-Next",
    prevEl: ".masterSwiper-Prev",
  },

  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      speed: 400,
    },

    768: {
      slidesPerView: 1.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1600: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1920: {
      slidesPerView: 1,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

var swiper0 = new Swiper(".outClassSwiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  freeMode: true,
  loop: true,
  // speed: 400,

  navigation: {
    nextEl: ".masterSwiper-Next",
    prevEl: ".masterSwiper-Prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 2.1,
      freeMode: true,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: true,
      slidesPerGroup: 1,
    },

    1440: {
      slidesPerView: 3.5,
      freeMode: true,
      slidesPerGroup: 1,
    },
  },
});

var swiper = new Swiper(".industryTechSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".industrySwiper-Next",
    prevEl: ".industrySwiper-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 2.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 2.5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".logoSwiper", {
  slidesPerView: 1,
  spaceBetween: 30,
  loop: true,
  centeredSlides: true,
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },
});

var swiper = new Swiper(".mastersScrollPgp", {
  slidesPerView: 1,
  spaceBetween: 30,
  loop: true,
  centeredSlides: true,
  autoplay: {
    delay: 400,
    disableOnInteraction: false,
  },
  breakpoints: {
    640: {
      slidesPerView: 2,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 3,
      spaceBetween: 40,
    },
    1024: {
      slidesPerView: 4,
      spaceBetween: 30,
    },
  },
});



var swiper = new Swiper(".roadMapSwiper", {
  slidesPerView: 1.4,
  spaceBetween: 10,
  loop: true,
  speed: 3000,
  autoplay: {
    delay: 2000,
    disableOnInteraction: false,
  },

  breakpoints: {
    640: {
      slidesPerView: 2,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 1.8,
      spaceBetween: 40,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 30,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4.2,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".studentAlumniSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 20,
  freeMode: true,
  navigation: {
    nextEl: ".studentAlumniSwiper-Next",
    prevEl: ".studentAlumniSwiper-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3.1,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".phyMastersScroll", {
  slidesPerView: "auto", // Adjusts dynamically

  spaceBetween: 20,
  loop: true, // Enables infinite loop
  speed: 300, // Smooth transition speed
  autoplay: {
    delay: 400, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    // pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".phyMastersScroll-next",
    prevEl: ".phyMastersScroll-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 5.5,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 5.5,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 6.2,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 6.2,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".academicDsai", {
  slidesPerView: 2.5,
  spaceBetween: 30,

  navigation: {
    nextEl: ".academicDsai-next",
    prevEl: ".academicDsai-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3.3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".facultySwiper21", {
  slidesPerView: 2.5,
  spaceBetween: 30,

  breakpoints: {
    0: {
      slidesPerView: 1.3,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 1.5,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 1.5,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 5,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 5,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".activitiesSlider", {
  slidesPerView: 2.5,
  spaceBetween: 30,

  navigation: {
    nextEl: ".activitiesSlider-next",
    prevEl: ".activitiesSlider-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3.3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".committeClubSwiper", {
  slidesPerView: 2.5,
  spaceBetween: 30,

  navigation: {
    nextEl: ".committeClubSwiper-next",
    prevEl: ".committeClubSwiper-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      speed: 400,
      spaceBetween: 20,
    },

    768: {
      slidesPerView: 2.2,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },

    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },

    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },

    1600: {
      slidesPerView: 3.3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".mastersScrollerStudent", {
  slidesPerView: "auto", // Adjusts dynamically
  centeredSlides: true, // Centers active slide
  spaceBetween: 20,
  loop: true, // Enables infinite loop
  speed: 300, // Smooth transition speed
  autoplay: {
    delay: 2500, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    // pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".mastersScrollerStudent-next",
    prevEl: ".mastersScrollerStudent-prev",
  },
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      spaceBetween: 20,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 20,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1366: {
      slidesPerView: 3.5,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 5,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 5.8,
      spaceBetween: 20,
    },
  },
});





var swiper = new Swiper(".mastersScrollAi", {
  slidesPerView: "auto", // Adjusts dynamically
  // centeredSlides: true, // Centers active slide
  spaceBetween: 20,
  loop: true, // Enables infinite loop
  autoplay: {
    delay: 1500, // Time before switching slides
    disableOnInteraction: false, // Keeps autoplay running even after interaction
    // pauseOnMouseEnter: true, // Pauses autoplay when hovering
  },
  grabCursor: true, // Shows grabbing cursor
  navigation: {
    nextEl: ".mastersScrollAi-next",
    prevEl: ".mastersScrollAi-prev",
  },
  freeMode: true, // Enables free mode for smooth scrolling
  breakpoints: {
    0: {
      slidesPerView: 1.3,
      spaceBetween: 15,
      autoplay: false,
      loop: false,
    },
    768: {
      slidesPerView: 2.3,
      spaceBetween: 15,
      autoplay: false,
    },
    1024: {
      slidesPerView: 3.5,
      spaceBetween: 10,
    },
    1366: {
      slidesPerView: 5,
      spaceBetween: 10,
    },
    1440: {
      slidesPerView: 5,
      spaceBetween: 10,
    },

    1920: {
      slidesPerView: 5,
      spaceBetween: 10,
    },
  },
});

var swiper = new Swiper(".claimSwiper", {
  slidesPerView: 1.01,
  spaceBetween: 10,
  freeMode: true,
  speed: 300,

  navigation: {
    nextEl: ".claimSwiper-Next",
    prevEl: ".claimSwiper-Prev",
  },
  breakpoints: {
    768: {
      slidesPerView: 1,
      freeMode: true,
      autoplay: false,
      spaceBetween: 10,

    },
    1024: {
      slidesPerView: 3.1,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3.2,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 4,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});

var swiper = new Swiper(".bootcamp", {
  spaceBetween: 15,
  navigation: {

    nextEl: ".bootcamp-next",
    prevEl: ".bootcamp-prev",
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".realConversationSwiper", {
  spaceBetween: 15,
  navigation: {

    nextEl: ".realConversationSwiper-Next",
    prevEl: ".realConversationSwiper-Prev",
  },
  pagination: {
    el: ".realConversationSwiper-pagination",
    clickable: true,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});


var swiper = new Swiper(".globalFinanceSwiper", {
  spaceBetween: 15,
  navigation: {

    nextEl: ".globalFinanceSwiper-Next",
    prevEl: ".globalFinanceSwiper-Prev",
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    768: {
      slidesPerView: 1.1,
      freeMode: true,
      autoplay: false,
      speed: 400,
    },
    1024: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
    },
    1366: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1440: {
      slidesPerView: 3,
      freeMode: false,
      slidesPerGroup: 1,
      spaceBetween: 20,
    },
    1600: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
    1920: {
      slidesPerView: 3,
      freeMode: false,
      spaceBetween: 20,
    },
  },
});








