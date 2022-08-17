const sidebar = document.querySelector('#sidebar');
const toggleSidebar = document.querySelector('#toggle-sidebar');

toggleSidebar.onclick = () => {
  sidebar.classList.toggle('collapsed');
  //toggleSidebar.innerText = sidebar.classList.contains('collapsed') ? '>' : '<';
};

function toggle_sidebar() {
	sidebar.classList.toggle('collapsed');
}
