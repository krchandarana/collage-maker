import { h } from '../utils/dom.js';
import { Store } from '../core/Store.js';
import { EventBus } from '../core/EventBus.js';
import { PAPER_SIZES } from '../core/constants.js';
import { exportCollage } from '../rendering/ExportRenderer.js';

export function createExportDialog() {
  let format = 'png';
  let quality = 0.92;

  // Format toggle
  const pngBtn = h('button', {
    class: 'sidebar-btn active',
    onClick: () => {
      format = 'png';
      pngBtn.classList.add('active');
      jpegBtn.classList.remove('active');
      qualityRow.style.display = 'none';
    },
  }, 'PNG');

  const jpegBtn = h('button', {
    class: 'sidebar-btn',
    onClick: () => {
      format = 'jpeg';
      jpegBtn.classList.add('active');
      pngBtn.classList.remove('active');
      qualityRow.style.display = 'flex';
    },
  }, 'JPEG');

  const qualitySlider = h('input', {
    type: 'range',
    min: '0.1',
    max: '1',
    step: '0.05',
    value: '0.92',
    onInput: (e) => { quality = Number(e.target.value); },
  });

  const qualityRow = h('div', { class: 'settings-row', style: { display: 'none' } },
    h('div', { class: 'settings-label' },
      h('span', {}, 'Quality'),
      h('span', { class: 'settings-value' }, '92%'),
    ),
    qualitySlider,
  );

  qualitySlider.addEventListener('input', () => {
    qualityRow.querySelector('.settings-value').textContent = `${Math.round(quality * 100)}%`;
  });

  // Info display
  const infoText = h('div', {
    style: {
      fontSize: '13px',
      color: 'var(--color-text-secondary)',
      padding: '12px',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      lineHeight: '1.6',
    },
  });

  function updateInfo() {
    const state = Store.getState();
    const paper = PAPER_SIZES.find((p) => p.id === state.paperId);
    const label = paper ? paper.label : 'Custom';
    const mm = paper ? `${paper.widthMM} \u00d7 ${paper.heightMM} mm` : '';
    infoText.innerHTML = `
      <strong>${label}</strong><br>
      ${mm ? mm + '<br>' : ''}
      ${state.canvasWidth} \u00d7 ${state.canvasHeight} px at 300 DPI
    `;
  }

  // Progress bar
  const progressBar = h('div', {
    style: {
      height: '4px',
      background: 'var(--color-border)',
      borderRadius: '2px',
      overflow: 'hidden',
      display: 'none',
    },
  },
    h('div', {
      class: 'export-progress-fill',
      style: {
        height: '100%',
        width: '0%',
        background: 'var(--color-primary)',
        transition: 'width 100ms',
      },
    })
  );

  const exportBtn = h('button', {
    class: 'btn btn-primary',
    style: { width: '100%', justifyContent: 'center', padding: '12px' },
    onClick: handleExport,
  }, 'Download');

  const closeBtn = h('button', {
    class: 'modal-close',
    onClick: () => overlay.classList.add('hidden'),
  }, '\u00d7');

  const card = h('div', { class: 'modal-card' },
    h('div', { class: 'modal-header' },
      h('h2', { class: 'modal-title' }, 'Export Collage'),
      closeBtn,
    ),
    infoText,
    h('div', { style: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' } },
      h('div', { class: 'sidebar-section' },
        h('h3', { class: 'sidebar-heading' }, 'Format'),
        h('div', { class: 'sidebar-btn-group' }, pngBtn, jpegBtn),
      ),
      qualityRow,
      progressBar,
      exportBtn,
    ),
  );

  const overlay = h('div', { class: 'modal-overlay hidden' }, card);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  // Listen for show event
  EventBus.on('showExport', () => {
    updateInfo();
    overlay.classList.remove('hidden');
  });

  async function handleExport() {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    progressBar.style.display = 'block';

    try {
      await exportCollage({
        format,
        quality,
        onProgress: (p) => {
          progressBar.querySelector('.export-progress-fill').style.width = `${Math.round(p * 100)}%`;
        },
      });
    } catch (err) {
      console.error('Export failed:', err);
      exportBtn.textContent = `Error: ${err.message}`;
      setTimeout(() => {
        exportBtn.textContent = 'Download';
      }, 3000);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Download';
      progressBar.style.display = 'none';
      progressBar.querySelector('.export-progress-fill').style.width = '0%';
    }
  }

  return { overlay };
}
