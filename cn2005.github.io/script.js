const canvas = document.querySelector("[data-field-canvas]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.documentElement.classList.add("js-enabled");

function initFieldCanvas() {
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let rafId = 0;
  let pointer = { x: 0.62, y: 0.36 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStaticFrame() {
    draw(18);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(
      width * pointer.x,
      height * pointer.y,
      20,
      width * pointer.x,
      height * pointer.y,
      Math.max(width, height) * 0.72
    );
    gradient.addColorStop(0, "rgba(201, 164, 106, 0.13)");
    gradient.addColorStop(0.38, "rgba(143, 154, 168, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const spacing = width < 640 ? 38 : 54;
    const cols = Math.ceil(width / spacing) + 2;
    const rows = Math.ceil(height / spacing) + 2;
    const t = time * 0.001;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let y = -1; y < rows; y += 1) {
      for (let x = -1; x < cols; x += 1) {
        const px = x * spacing;
        const py = y * spacing;
        const dx = px / width - pointer.x;
        const dy = py / height - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle =
          Math.sin(x * 0.62 + t * 0.75) +
          Math.cos(y * 0.58 - t * 0.68) +
          Math.atan2(dy, dx);
        const length = spacing * (0.28 + Math.max(0, 0.22 - distance * 0.16));
        const alpha = Math.max(0.035, 0.16 - distance * 0.12);

        ctx.strokeStyle = `rgba(222, 204, 170, ${alpha})`;
        ctx.lineWidth = distance < 0.24 ? 1.2 : 0.7;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "rgba(226, 216, 198, 0.06)";
    ctx.lineWidth = 1;
    const horizon = height * (0.6 + Math.sin(t * 0.45) * 0.03);
    for (let i = 0; i < 7; i += 1) {
      const y = horizon + i * i * 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.26, y - 18, width * 0.68, y + 20, width, y - 8);
      ctx.stroke();
    }
    ctx.restore();

    frame += 1;
    if (!reduceMotion.matches) {
      rafId = requestAnimationFrame(draw);
    }
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer = {
        x: event.clientX / Math.max(1, width),
        y: event.clientY / Math.max(1, height),
      };
    },
    { passive: true }
  );

  reduceMotion.addEventListener("change", () => {
    cancelAnimationFrame(rafId);
    if (reduceMotion.matches) {
      drawStaticFrame();
    } else {
      rafId = requestAnimationFrame(draw);
    }
  });

  resize();
  if (reduceMotion.matches) {
    drawStaticFrame();
  } else {
    rafId = requestAnimationFrame(draw);
  }
}

function initReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.18 }
  );

  elements.forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
      element.classList.add("is-visible");
      return;
    }
    observer.observe(element);
  });
}

function initTiltCards() {
  if (reduceMotion.matches) return;

  document.querySelectorAll("[data-tilt-card]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 5).toFixed(2)}deg`);
      card.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(0)}%`);
      card.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(0)}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--glow-x", "50%");
      card.style.setProperty("--glow-y", "50%");
    });
  });
}

initFieldCanvas();
initReveal();
initTiltCards();
