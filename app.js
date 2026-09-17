"use strict";
document.documentElement.classList.add("js");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
}
menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) setMenu(false);
});
const desktop = window.matchMedia("(min-width: 641px)");
desktop.addEventListener("change", () => setMenu(false));

const filters = document.querySelectorAll("[data-filter]");
const projects = document.querySelectorAll(".project-card[data-status]");
filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    let count = 0;
    projects.forEach((project) => {
      const show = button.dataset.filter === "all" || project.dataset.status === button.dataset.filter;
      project.hidden = !show;
      if (show) count += 1;
    });
    document.getElementById("filter-status").textContent = button.textContent + " 프로젝트 " + count + "개";
  });
});
