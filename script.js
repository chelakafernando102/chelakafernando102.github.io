const year = document.querySelector("#year");
const printButton = document.querySelector("#printResume");
const copyEmailButton = document.querySelector("#copyEmail");
const copyStatus = document.querySelector("#copyStatus");
const scrollMeter = document.querySelector("#scrollMeter");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (year) {
  year.textContent = new Date().getFullYear();
}

if (printButton) {
  printButton.addEventListener("click", () => {
    window.print();
  });
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

const updateScrollState = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

  if (scrollMeter) {
    scrollMeter.style.width = `${Math.min(progress * 100, 100)}%`;
  }

  let activeSection = null;

  for (const section of sections) {
    const rect = section.getBoundingClientRect();

    if (rect.top <= 130) {
      activeSection = section;
    }
  }

  navLinks.forEach((link) => {
    link.classList.toggle("active", activeSection && link.getAttribute("href") === `#${activeSection.id}`);
  });
};

window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("resize", updateScrollState);
updateScrollState();
