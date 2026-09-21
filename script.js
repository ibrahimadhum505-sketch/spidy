// Spidy Shop - script.js

// =============================================
// 1. CART DATA MANAGEMENT (localStorage)
// =============================================
const CART_STORAGE_KEY = "spidy_shop_cart";

function getCart() {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read cart from localStorage", e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error("Failed to save cart to localStorage", e);
  }
  updateCartBadge();
}

function getCartTotalCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);
}

function updateCartBadge() {
  const count = getCartTotalCount();
  const badges = document.querySelectorAll(".cart-badge, #cartBadge");
  badges.forEach((b) => {
    b.textContent = count;
  });
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existingIndex = cart.findIndex((item) => item.id === product.id && (item.variant || "") === (product.variant || ""));

  if (existingIndex > -1) {
    cart[existingIndex].qty = (parseInt(cart[existingIndex].qty) || 1) + qty;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      variant: product.variant || "",
      qty: qty
    });
  }

  saveCart(cart);
}

function incrementCartItem(index) {
  const cart = getCart();
  if (cart[index]) {
    cart[index].qty = (parseInt(cart[index].qty) || 1) + 1;
    saveCart(cart);
    renderCartPage();
    renderCheckoutPage();
  }
}

let toastTimeout = null;
function showToast(message) {
  let toast = document.getElementById("cartToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.className = "bottom-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon">✕</span> <span>${message}</span>`;
  toast.classList.add("show");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function decrementCartItem(index) {
  const cart = getCart();
  if (cart[index]) {
    if (cart[index].qty > 1) {
      cart[index].qty -= 1;
    } else {
      cart.splice(index, 1);
      showToast("Product removed from cart");
    }
    saveCart(cart);
    renderCartPage();
    renderCheckoutPage();
  }
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartBadge();
}

// =============================================
// 2. DRAWER CONTROLS
// =============================================
const hamburgerBtn = document.getElementById("hamburgerBtn");
const drawer = document.getElementById("drawer");
const drawerClose = document.getElementById("drawerClose");
const drawerOverlay = document.getElementById("drawerOverlay");

function openDrawer() {
  if (drawer && drawerOverlay) {
    drawer.classList.add("open");
    drawerOverlay.classList.add("active");
  }
}
function closeDrawer() {
  if (drawer && drawerOverlay) {
    drawer.classList.remove("open");
    drawerOverlay.classList.remove("active");
  }
}

if (hamburgerBtn) hamburgerBtn.addEventListener("click", openDrawer);
if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// Drawer Navigation Link Clicks (Smooth Scroll to sections)
document.querySelectorAll(".drawer-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        closeDrawer();
        setTimeout(() => {
          // Scroll only inside .scroll-content so the fixed header stays visible
          const scrollContent = document.getElementById("scrollContent");
          if (scrollContent) {
            const scrollContentRect = scrollContent.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const offset = targetRect.top - scrollContentRect.top + scrollContent.scrollTop;
            scrollContent.scrollTo({ top: offset, behavior: "smooth" });
          } else {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      }
    } else {
      closeDrawer();
    }
  });
});

// =============================================
// 3. HERO / PRODUCT IMAGE SLIDER (WITH TOUCH & MOUSE SWIPE)
// =============================================
const track = document.getElementById("slidesTrack");
const dots = document.querySelectorAll(".dot");
const slides = document.querySelectorAll(".slide");
const TOTAL = slides.length;
const DELAY = 4000;
let current = 0;
let timer = null;

if (track && TOTAL > 0) {
  track.style.width = `${TOTAL * 100}%`;
  slides.forEach((slide) => {
    slide.style.width = `${100 / TOTAL}%`;
  });

  function goTo(index) {
    current = (index + TOTAL) % TOTAL;
    track.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)";
    track.style.transform = `translateX(-${current * (100 / TOTAL)}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function startAutoPlay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), DELAY);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(parseInt(dot.dataset.index));
      startAutoPlay();
    });
  });

  startAutoPlay();

  // HORIZONTAL TOUCH & MOUSE DRAG SWIPE FEATURE
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const handleStart = (clientX) => {
    isDragging = true;
    startX = clientX;
    currentX = clientX;
    clearInterval(timer);
    track.style.transition = "none";
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    currentX = clientX;
    const diffX = currentX - startX;
    const containerWidth = track.parentElement ? track.parentElement.clientWidth : 360;
    const dragPercent = (diffX / containerWidth) * (100 / TOTAL);
    const basePercent = -current * (100 / TOTAL);
    track.style.transform = `translateX(${basePercent + dragPercent}%)`;
  };

  const handleEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    const diffX = currentX - startX;
    const threshold = 35; // Pixels required to trigger swipe

    if (diffX < -threshold) {
      goTo(current + 1);
    } else if (diffX > threshold) {
      goTo(current - 1);
    } else {
      goTo(current);
    }
    startAutoPlay();
  };

  // Touch events
  track.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) handleStart(e.touches[0].clientX);
  }, { passive: true });

  track.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
      currentX = e.touches[0].clientX;
      handleMove(currentX);
    }
  }, { passive: true });

  track.addEventListener("touchend", handleEnd);

  // Mouse events (Desktop drag swipe)
  track.style.cursor = "grab";
  track.addEventListener("mousedown", (e) => {
    e.preventDefault();
    track.style.cursor = "grabbing";
    handleStart(e.clientX);
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) handleMove(e.clientX);
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      track.style.cursor = "grab";
      handleEnd();
    }
  });

  // Prevent ghost image drag
  track.querySelectorAll("img").forEach((img) => {
    img.addEventListener("dragstart", (e) => e.preventDefault());
  });
}

// =============================================
// 4. PRODUCT DETAIL PAGE CONTROLS
// =============================================
const qtyMinus = document.getElementById("qtyMinus");
const qtyPlus = document.getElementById("qtyPlus");
const qtyVal = document.getElementById("qtyVal");
const addCartBtn = document.getElementById("addCartBtn");
const buyNowBtn = document.getElementById("buyNowBtn");

if (qtyMinus && qtyPlus && qtyVal) {
  let count = 1;
  qtyMinus.addEventListener("click", () => {
    if (count > 1) {
      count--;
      qtyVal.textContent = count;
    }
  });
  qtyPlus.addEventListener("click", () => {
    count++;
    qtyVal.textContent = count;
  });
}

function getSelectedVariant() {
  const activeBtn = document.querySelector(".variant-pill-btn.active");
  if (!activeBtn) return "";
  const parentItem = activeBtn.closest(".variant-item");
  if (parentItem) {
    const nameEl = parentItem.querySelector(".variant-name");
    if (nameEl && nameEl.textContent.trim()) return nameEl.textContent.trim();
  }
  return activeBtn.textContent.trim();
}

function getCurrentProductInfo() {
  const titleEl = document.querySelector(".product-title-banner h2");
  const costEl = document.querySelector(".cost-badge");
  const imgEl = document.querySelector(".hero-slider .slide img");

  let rawTitle = titleEl ? titleEl.textContent.trim() : "Product";
  let cleanTitle = rawTitle.replace(/^P\.D\s*:\s*/i, "").trim();

  let price = 0;
  if (costEl) {
    const numMatch = costEl.textContent.replace(/[^\d]/g, "");
    price = parseInt(numMatch) || 0;
  }

  let image = imgEl ? imgEl.getAttribute("src") : "prod. images1/a_return_me_this_exact.webp";
  let variant = getSelectedVariant();
  let id = window.location.pathname.split("/").pop() || cleanTitle.toLowerCase().replace(/\s+/g, "-");

  return {
    id: id,
    title: cleanTitle,
    price: price,
    image: image,
    variant: variant
  };
}

if (addCartBtn) {
  addCartBtn.addEventListener("click", () => {
    const qty = parseInt(qtyVal ? qtyVal.textContent : "1") || 1;
    const product = getCurrentProductInfo();
    addToCart(product, qty);

    const originalText = addCartBtn.textContent;
    addCartBtn.textContent = "Added ✓";
    addCartBtn.style.background = "#76e053";
    addCartBtn.style.color = "#000000";

    setTimeout(() => {
      addCartBtn.textContent = originalText;
      addCartBtn.style.background = "";
      addCartBtn.style.color = "";
    }, 1200);
  });
}

if (buyNowBtn) {
  buyNowBtn.addEventListener("click", () => {
    const qty = parseInt(qtyVal ? qtyVal.textContent : "1") || 1;
    const product = getCurrentProductInfo();
    addToCart(product, qty);
    window.location.href = "checkout.html";
  });
}

// Variant selection (if present)
const variantBtns = document.querySelectorAll(".variant-pill-btn");
if (variantBtns.length > 0) {
  variantBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      variantBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// =============================================
// 5. CART PAGE RENDERING
// =============================================
function renderCartPage() {
  const container = document.getElementById("cartViewContainer");
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    // Empty Cart View
    container.innerHTML = `
      <div class="cart-card">
        <h1 class="card-head-title">আপনার Cart</h1>
        <div class="card-divider-line">
          <span class="divider-tick"></span>
          <span class="divider-dash"></span>
          <span class="divider-tick"></span>
        </div>
        <div class="cart-empty-box">
          <p class="cart-empty-text">আপনার Cart বর্তমানে<br />খালি আছে</p>
        </div>
      </div>
      <a href="index.html" class="btn-action-green">পণ্য নির্বাচন করুন</a>
    `;
  } else {
    // Cart with items
    let itemsHtml = cart
      .map(
        (item, index) => `
        <div class="cart-item-row" data-index="${index}">
          <img src="${item.image}" alt="${item.title}" class="cart-item-img" />
          <div class="cart-item-details">
            <h2 class="cart-item-title">${item.title}</h2>
            <div class="cart-item-meta">
              <span class="cart-item-qun">Qun: ×${item.qty}</span>
              <span class="cart-item-price">per: ৳${item.price}</span>
            </div>
            ${item.variant ? `<div class="cart-item-variant" style="font-size: 13px; font-weight: 700; color: #555555; margin-top: 3px;">Variant: <span style="color:#000;">${item.variant}</span></div>` : ''}
          </div>
          <div class="cart-qty-actions-col">
            <button type="button" class="cart-plus-btn" data-index="${index}" aria-label="Increase quantity">+</button>
            <button type="button" class="cart-minus-btn" data-index="${index}" aria-label="Decrease quantity">
              <span class="cart-minus-icon"></span>
            </button>
          </div>
        </div>
      `
      )
      .join("");

    container.innerHTML = `
      <div class="cart-card">
        <h1 class="card-head-title">আপনার Cart</h1>
        <div class="card-divider-line">
          <span class="divider-tick"></span>
          <span class="divider-dash"></span>
          <span class="divider-tick"></span>
        </div>
        <div class="cart-items-list" id="cartItemsList">
          ${itemsHtml}
        </div>
        <p class="cart-order-notice">“Order will be sent by 3-5 days”</p>
      </div>
      <a href="checkout.html" class="btn-action-green">Checkout  করুন</a>
    `;

    // Attach plus button events
    const plusBtns = container.querySelectorAll(".cart-plus-btn");
    plusBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"));
        incrementCartItem(idx);
      });
    });

    // Attach minus button events
    const minusBtns = container.querySelectorAll(".cart-minus-btn");
    minusBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"));
        decrementCartItem(idx);
      });
    });
  }
}

// =============================================
// 6. CHECKOUT PAGE RENDERING & SUBMISSION
// =============================================
function renderCheckoutPage() {
  const invoiceList = document.getElementById("invoiceItemsList");
  if (!invoiceList) return;

  const cart = getCart();
  const subtotalEl = document.getElementById("invoiceSubtotal");
  const deliveryEl = document.getElementById("invoiceDelivery");
  const totalEl = document.getElementById("invoiceTotal");

  if (cart.length === 0) {
    invoiceList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666; font-size: 15px;">
        কোনো পণ্য নির্বাচন করা হয়নি।<br />
        <a href="index.html" style="color: #000; font-weight: 700; text-decoration: underline; margin-top: 8px; display: inline-block;">পণ্য নির্বাচন করুন</a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = "৳0";
    if (deliveryEl) deliveryEl.textContent = "৳0";
    if (totalEl) totalEl.textContent = "৳0";
    return;
  }

  let subtotal = 0;
  let itemsHtml = cart
    .map((item) => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;
      return `
        <div class="cart-item-row">
          <img src="${item.image}" alt="${item.title}" class="cart-item-img" />
          <div class="cart-item-details">
            <h3 class="cart-item-title">${item.title}</h3>
            <div class="cart-item-meta">
              <span class="cart-item-qun">Qun: ×${item.qty}</span>
              <span class="cart-item-price">per: ৳${item.price}</span>
            </div>
            ${item.variant ? `<div class="cart-item-variant" style="font-size: 13px; font-weight: 700; color: #555555; margin-top: 3px;">Variant: <span style="color:#000;">${item.variant}</span></div>` : ''}
          </div>
        </div>
      `;
    })
    .join("");

  invoiceList.innerHTML = itemsHtml;

  const deliveryCharge = 100;
  const total = subtotal + deliveryCharge;

  if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
  if (deliveryEl) deliveryEl.textContent = `৳${deliveryCharge}`;
  if (totalEl) totalEl.textContent = `৳${total}`;
}

// Checkout Submit Handler
const placeOrderBtn = document.getElementById("placeOrderBtn");
const orderModal = document.getElementById("orderModal");

if (placeOrderBtn) {
  placeOrderBtn.addEventListener("click", () => {
    const cart = getCart();
    if (cart.length === 0) {
      alert("আপনার কার্টে কোনো পণ্য নেই। অনুগ্রহ করে প্রথমে পণ্য যোগ করুন।");
      window.location.href = "index.html";
      return;
    }

    const nameInput = document.getElementById("custName");
    const phoneInput = document.getElementById("custPhone");
    const divInput = document.getElementById("custDivision");
    const distInput = document.getElementById("custDistrict");
    const thanaInput = document.getElementById("custThana");
    const addrInput = document.getElementById("custAddress");

    const requiredFields = [
      { el: nameInput, name: "আপনার নাম" },
      { el: phoneInput, name: "মোবাইল নাম্বার" },
      { el: divInput, name: "বিভাগ" },
      { el: distInput, name: "জেলা" },
      { el: thanaInput, name: "উপজেলা/থানা" },
      { el: addrInput, name: "সম্পূর্ণ ঠিকানা" }
    ];

    let hasError = false;
    let firstInvalid = null;

    requiredFields.forEach((field) => {
      if (!field.el || !field.el.value.trim()) {
        if (field.el) field.el.classList.add("invalid");
        if (!firstInvalid && field.el) firstInvalid = field.el;
        hasError = true;
      } else {
        if (field.el) field.el.classList.remove("invalid");
      }
    });

    if (hasError) {
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Prepare backend payload & submit order
    const orderId = Math.floor(100000 + Math.random() * 900000);
    const whatsappInput = document.getElementById("custWhatsapp");
    const noteInput = document.getElementById("custNote");

    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += (parseInt(item.price) || 0) * (parseInt(item.qty) || 1);
    });
    const deliveryCharge = 100;
    const total = subtotal + deliveryCharge;

    const orderPayload = {
      orderId: orderId,
      customer: {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        whatsapp: whatsappInput ? whatsappInput.value.trim() : "",
        division: divInput.value.trim(),
        district: distInput.value.trim(),
        thana: thanaInput.value.trim(),
        address: addrInput.value.trim(),
        note: noteInput ? noteInput.value.trim() : ""
      },
      cart: cart,
      pricing: {
        subtotal: subtotal,
        deliveryFee: deliveryCharge,
        total: total
      }
    };

    const origBtnText = placeOrderBtn.textContent;
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "অর্ডার প্রসেসিং হচ্ছে...";

    fetch("https://spidy-ofv5.onrender.com/api/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      keepalive: true,
      body: JSON.stringify(orderPayload)
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Order email notification server response:", data);
      })
      .catch((err) => {
        console.error("Backend order notification failed:", err);
      })
      .finally(() => {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = origBtnText;

        if (orderModal) {
          const detailsEl = document.getElementById("orderModalDetails");
          if (detailsEl) {
            detailsEl.innerHTML = `
              অর্ডার আইডি: <strong>#${orderId}</strong><br />
              গ্রাহক: <strong>${nameInput.value.trim()}</strong><br />
              ঠিকানা: <strong>${addrInput.value.trim()}, ${distInput.value.trim()}</strong><br /><br />
              ৩-৫ দিনের মধ্যে ক্যাশ অন ডেলিভারিতে পণ্য পৌঁছে যাবে।
            `;
          }
          orderModal.classList.add("active");
          clearCart();
        }
      });
  });
}

// Remove invalid highlight on input
document.querySelectorAll(".checkout-field-input").forEach((input) => {
  input.addEventListener("input", () => {
    if (input.value.trim()) {
      input.classList.remove("invalid");
    }
  });
});

// =============================================
// 7. INITIALIZE ON DOM READY
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  renderCartPage();
  renderCheckoutPage();
});
