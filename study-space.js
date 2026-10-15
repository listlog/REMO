(() => {
  'use strict';
  const tasks = Array.from(document.querySelectorAll('[data-demo-task]'));
  const count = document.getElementById('demo-count');
  const progress = document.getElementById('demo-progress');
  function update() {
    const completed = tasks.filter(task => task.checked).length;
    count.textContent = `${completed} / ${tasks.length}`;
    progress.value = completed;
    progress.textContent = count.textContent;
  }
  tasks.forEach(task => task.addEventListener('change', update));
  document.getElementById('demo-reset').addEventListener('click', () => {
    tasks.forEach((task, index) => { task.checked = index === 0; });
    update();
  });
  update();
})();
