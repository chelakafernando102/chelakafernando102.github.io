const year = document.querySelector("#year");
const copyEmailButton = document.querySelector("#copyEmail");
const copyStatus = document.querySelector("#copyStatus");
const scrollMeter = document.querySelector("#scrollMeter");
const resumeButton = document.querySelector("#resumeBtn");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (year) {
  year.textContent = new Date().getFullYear();
}

if (copyEmailButton && copyStatus) {
  copyEmailButton.addEventListener("click", async () => {
    const email = "chelakafernando102@gmail.com";

    try {
      await navigator.clipboard.writeText(email);
      copyStatus.textContent = "Email copied.";
    } catch {
      copyStatus.textContent = email;
    }
  });
}

if (resumeButton && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const tones = ["#c7a45a", "#2f6f5b", "#4e7d94", "#6d2f35"];
  let toneIndex = 0;

  window.setInterval(() => {
    toneIndex = (toneIndex + 1) % tones.length;
    document.documentElement.style.setProperty("--resume-accent", tones[toneIndex]);
  }, 1200);
}

const updateScrollState = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

  if (scrollMeter) {
    scrollMeter.style.width = `${Math.min(progress * 100, 100)}%`;
  }

  let activeSection = null;

  for (const section of sections) {
    const rect = section.getBoundingClientRect();

    if (rect.top <= 132) {
      activeSection = section;
    }
  }

  navLinks.forEach((link) => {
    link.classList.toggle("active", activeSection && link.getAttribute("href") === `#${activeSection.id}`);
  });
};

const revealTargets = document.querySelectorAll(
  ".section-heading, .proof-grid article, .method-list article, .timeline-item, .project-card, .capability-list article, .education-list article, .contact-panel"
);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealTargets.forEach((target) => {
    target.classList.add("reveal");
    revealObserver.observe(target);
  });
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}

window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("resize", updateScrollState);
updateScrollState();
