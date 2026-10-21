import { $ } from './dom';
import { state } from './models';
import { isPage, type Page } from './types';
export function navigate(page: string) {
  if (!isPage(page)) page = 'store';
  const destination = isPage(page) ? page : 'store';
  state.page = destination;
  document.body.dataset.page = destination;
  document
    .querySelectorAll<HTMLElement>('[id^="page-"]')
    .forEach((el) => (el.hidden = el.id !== 'page-' + page));
  document.querySelectorAll<HTMLElement>('.nav-link').forEach((el) => {
    if (el.dataset.page === page) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  $('breadcrumb-title').textContent = {
    store: 'Agent store',
    workspace: 'Dashboard',
    agents: 'Installed agents',
    blackboard: 'Blackboard',
    executions: 'Executions',
    trust: 'Trust & receipts',
    runtime: 'Runtime & settings',
  }[destination];
  if (location.hash !== '#' + page) history.replaceState(null, '', '#' + page);
  closeMenu();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
export function closeMenu() {
  $('sidebar').classList.remove('open');
  $('mobile-shade').classList.remove('open');
  $('menu').setAttribute('aria-expanded', 'false');
}
