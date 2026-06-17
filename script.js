// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// Mobile burger menu
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Scroll fade-in observer
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ── Google Sheets shows ───────────────────────────────────────────────────────
// Published CSV URL from File → Share → Publish to web → CSV
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvorOEZfpJKgRAOc_jgnAya7Uq5wzwGqru6_vwyHN76peGMkjCGrvkslPhnfwWJuHTiri4q_w4g93r/pub?output=csv';

function parseCSV(text) {
  return text.trim().split('\n').map(line => {
    const row = [];
    let cell = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cell.trim()); cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    return row;
  });
}

function parseDate(val) {
  if (!val) return null;
  const parts = val.split('-');
  if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return new Date(val);
}

async function loadShows() {
  const container = document.getElementById('shows-container');
  try {
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    const [, ...rows] = parseCSV(text); // skip header row

    const shows = rows
      .map(r => ({
        date:    r[0] ?? '',
        venue:   r[1] ?? '',
        city:    r[2] ?? '',
        country: r[3] ?? '',
        note:    r[4] ?? '',
        status:  (r[5] ?? '').toLowerCase().trim(),
        link:    r[6] ?? '#',
      }))
      .filter(s => s.date && s.venue)
      .map(s => ({ ...s, d: parseDate(s.date) }))
      .filter(s => s.d && !isNaN(s.d))
      .sort((a, b) => a.d - b.d);

    if (!shows.length) {
      container.innerHTML = '<p class="shows__empty">No upcoming shows — check back soon.</p>';
      return;
    }

    // Group by "Month Year"
    const groups = {};
    shows.forEach(s => {
      const key = s.d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      (groups[key] ??= []).push(s);
    });

    container.innerHTML = Object.entries(groups).map(([label, items]) => `
      <div class="month-group fade-up">
        <h3 class="month-label">${label}</h3>
        <ul class="show-list">
          ${items.map(s => {
            const day   = String(s.d.getDate()).padStart(2, '0');
            const month = s.d.toLocaleString('en-GB', { month: 'short' });
            const badge = s.status === 'selling-fast'
              ? '<span class="show-badge show-badge--soon">Selling Fast</span>'
              : s.status === 'sold-out'
              ? '<span class="show-badge show-badge--soldout">Sold Out</span>'
              : '';
            const btn = s.status === 'sold-out'
              ? `<a href="${s.link}" class="btn btn--ghost btn--sm">Waitlist</a>`
              : `<a href="${s.link}" class="btn btn--outline btn--sm">Tickets</a>`;
            return `
              <li class="show-item">
                <div class="show-item__date">
                  <span class="show-item__day">${day}</span>
                  <span class="show-item__month">${month}</span>
                </div>
                <div class="show-item__info">
                  <h4 class="show-item__venue">${s.venue}</h4>
                  <p class="show-item__location">${s.city}, ${s.country}</p>
                  ${s.note ? `<p class="show-item__note">${s.note}</p>` : ''}
                </div>
                <div class="show-item__actions">${badge}${btn}</div>
              </li>`;
          }).join('')}
        </ul>
      </div>
    `).join('');

    // Run fade-in observer on the newly rendered elements
    container.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  } catch {
    container.innerHTML = '<p class="shows__empty">Shows unavailable — check back soon.</p>';
  }
}

loadShows();
