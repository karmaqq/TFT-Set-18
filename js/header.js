export function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view-section");

  if (navButtons.length === 0) return;

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      views.forEach((view) => {
        view.classList.remove("active");
        if (view.id === targetId) {
          view.classList.add("active");
        }
      });

      const motherContainer = document.getElementById("mother");
      if (motherContainer) motherContainer.scrollTop = 0;
    });
  });
}
