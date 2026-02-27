import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { PAPER_SIZES, LAYOUT_TYPES } from '../core/constants.js';
import { GRID_TEMPLATES } from '../layout/layoutTemplates.js';
import { computeLayout } from '../layout/LayoutEngine.js';
import { createSettingsPanel } from './SettingsPanel.js';
import { createTextPanel } from './TextOverlay.js';

export function createSidebar() {
  // --- Layout section ---
  const layoutBtns = Object.values(LAYOUT_TYPES).map((type) => {
    const btn = h('button', {
      class: 'sidebar-btn',
      dataset: { layout: type },
      onClick: () => {
        Store.set({ layoutType: type });
        recomputeLayout();
        updateActiveLayout();
        updateGridTemplatesVisibility();
      },
    }, capitalize(type));
    return btn;
  });

  function updateActiveLayout() {
    const current = Store.getState().layoutType;
    layoutBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layout === current);
    });
  }

  // Grid template thumbnails
  const gridTemplateBtns = GRID_TEMPLATES.map((tpl) => {
    const cells = [];
    for (let r = 0; r < tpl.rows; r++) {
      for (let c = 0; c < tpl.cols; c++) {
        const pct = 100 / tpl.cols;
        const pctH = 100 / tpl.rows;
        cells.push(h('div', {
          class: 'grid-template-cell',
          style: {
            width: `calc(${pct}% - 1px)`,
            height: `calc(${pctH}% - 1px)`,
          },
        }));
      }
    }

    const btn = h('button', {
      class: 'grid-template-btn',
      title: tpl.label,
      dataset: { template: tpl.id },
      onClick: () => {
        Store.set({ gridTemplate: tpl.id });
        recomputeLayout();
        updateActiveTemplate();
      },
    }, ...cells);
    return btn;
  });

  // Auto template button
  const autoBtn = h('button', {
    class: 'grid-template-btn active',
    title: 'Auto',
    dataset: { template: 'auto' },
    onClick: () => {
      Store.set({ gridTemplate: null });
      recomputeLayout();
      updateActiveTemplate();
    },
  }, h('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '600',
      color: 'var(--color-text-secondary)',
    },
  }, 'Auto'));

  function updateActiveTemplate() {
    const current = Store.getState().gridTemplate;
    autoBtn.classList.toggle('active', current === null);
    gridTemplateBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.template === current);
    });
  }

  const gridTemplatesContainer = h('div', { class: 'grid-templates' },
    autoBtn,
    ...gridTemplateBtns,
  );

  function updateGridTemplatesVisibility() {
    const isGrid = Store.getState().layoutType === LAYOUT_TYPES.GRID;
    gridTemplatesContainer.style.display = isGrid ? 'grid' : 'none';
  }

  const layoutSection = h('div', { class: 'sidebar-section' },
    h('h3', { class: 'sidebar-heading' }, 'Layout'),
    h('div', { class: 'sidebar-btn-group' }, ...layoutBtns),
    gridTemplatesContainer,
  );

  // --- Paper size section ---
  const paperBtns = PAPER_SIZES.map((paper) => {
    const btn = h('button', {
      class: 'sidebar-btn paper-btn',
      dataset: { paper: paper.id },
      onClick: () => {
        Store.set({
          paperId: paper.id,
          canvasWidth: paper.widthPx,
          canvasHeight: paper.heightPx,
        });
        recomputeLayout();
        updateActivePaper();
      },
    },
      h('span', { class: 'paper-label' }, paper.label),
      h('span', { class: 'paper-dims' }, `${paper.widthMM}\u00d7${paper.heightMM}mm`),
    );
    return btn;
  });

  function updateActivePaper() {
    const current = Store.getState().paperId;
    paperBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.paper === current);
    });
  }

  const paperSection = h('div', { class: 'sidebar-section' },
    h('h3', { class: 'sidebar-heading' }, 'Paper Size'),
    h('div', { class: 'sidebar-paper-list' }, ...paperBtns),
  );

  // --- Settings section ---
  const { container: settingsContainer } = createSettingsPanel();

  // --- Text section ---
  const { container: textContainer } = createTextPanel();

  // --- Assemble sidebar ---
  const sidebar = h('aside', { class: 'sidebar' },
    layoutSection,
    paperSection,
    settingsContainer,
    textContainer,
  );

  // Initial state
  requestAnimationFrame(() => {
    updateActiveLayout();
    updateActivePaper();
    updateActiveTemplate();
    updateGridTemplatesVisibility();
  });

  return { sidebar };
}

function recomputeLayout() {
  const state = Store.getState();
  const cells = computeLayout(state);
  Store.set({ cells });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
